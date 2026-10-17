// §14.2 "Chat nhóm": 5.000 kết nối đồng thời, 50 tin/giây; p95 < 500ms, không mất tin.
// k6 không có client Socket.IO → nói thẳng giao thức Engine.IO v4 / Socket.IO v5 trên WebSocket:
//   mở `…/socket.io/?EIO=4&transport=websocket`, nhận `0{…}` (open), gửi `40{"token":…}` (CONNECT kèm
//   auth), ping `2` → pong `3`, sự kiện `42["event",payload]`, ack `42<id>[…]` → `43<id>[ack]`.
// Đo: ack `message.send` (sau commit, S-12) và độ trễ đến người nhận (createdAt → `message.new`).
// TOKENS / TOKENS_FILE: access token (phân tách dấu phẩy) của thành viên đã vào phòng ROOM_ID —
// tạo bằng infra/k6/README.md › "Chuẩn bị dữ liệu". Tin gửi = SENDERS phiên, mỗi phiên 1 tin / (SENDERS/50) giây.
import ws from 'k6/ws';
import { check } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { requireEnv, SOCKET, uuid } from './lib.js';

const CONNS = Number(__ENV.CONNS || 5000);
const MSG_PER_SEC = Number(__ENV.MSG_PER_SEC || 50);
const SENDERS = Number(__ENV.SENDERS || 100);
const HOLD_SEC = Number(__ENV.HOLD_SEC || 120);

const ackMs = new Trend('chat_ack_ms', true);
const deliverMs = new Trend('chat_deliver_ms', true);
const sent = new Counter('chat_sent');
const acked = new Counter('chat_acked');
const ackErr = new Counter('chat_ack_error');
const connected = new Counter('chat_connected');

export const options = {
  scenarios: {
    sockets: {
      executor: 'ramping-vus',
      stages: [
        { duration: __ENV.RAMP || '60s', target: CONNS },
        { duration: `${HOLD_SEC}s`, target: CONNS },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    chat_ack_ms: ['p(95)<500'],
    chat_deliver_ms: ['p(95)<500'],
    chat_ack_error: ['count==0'],
  },
};

// TOKENS_FILE: file token (phân tách dấu phẩy) — 1.000+ token vượt giới hạn dòng lệnh; TOKENS: ít token
const tokens = (__ENV.TOKENS_FILE ? open(__ENV.TOKENS_FILE) : __ENV.TOKENS || '')
  .trim()
  .split(',')
  .filter(Boolean);

// ROOM_IDS: nhiều phòng (phân tách dấu phẩy) — token thứ k vào phòng k % n, khớp `seed:load`
// LOAD_GROUPS cùng thứ tự (Q-B66-2). SOCKET_URLS: nhiều instance socket (như nginx chia), VU chia đều.
const rooms = (__ENV.ROOM_IDS || __ENV.ROOM_ID || '').split(',').filter(Boolean);
const sockets = (__ENV.SOCKET_URLS || SOCKET).split(',').filter(Boolean);

export default function () {
  if (!rooms.length) requireEnv('ROOM_IDS');
  const k = (__VU - 1) % Math.max(tokens.length, 1);
  const room = rooms[k % rooms.length];
  const token = tokens.length ? tokens[k] : requireEnv('TOKEN');
  const isSender = __VU <= SENDERS;
  const everyMs = Math.max(100, Math.round((SENDERS / MSG_PER_SEC) * 1000));
  const url = `${sockets[(__VU - 1) % sockets.length]}/socket.io/?EIO=4&transport=websocket`;
  const pending = new Map();
  let ackId = 0;

  const res = ws.connect(url, {}, (socket) => {
    const emit = (event, payload, onAck) => {
      ackId += 1;
      pending.set(ackId, onAck);
      socket.send(`42${ackId}${JSON.stringify([event, payload])}`);
    };

    socket.on('message', (raw) => {
      if (raw === '2') return socket.send('3'); // ping → pong
      if (raw.startsWith('0')) return socket.send(`40${JSON.stringify({ token })}`);
      if (raw.startsWith('40')) {
        connected.add(1);
        emit('room.join', { roomId: room }, () => undefined);
        if (isSender) {
          socket.setInterval(() => {
            const t0 = Date.now();
            sent.add(1);
            emit(
              'message.send',
              { roomId: room, clientMsgId: uuid(), kind: 'text', body: `k6 ${t0}`, mentions: [] },
              (ack) => {
                ackMs.add(Date.now() - t0);
                if (ack && ack.ok) acked.add(1);
                else ackErr.add(1);
              },
            );
          }, everyMs);
        }
        return undefined;
      }
      if (raw.startsWith('43')) {
        const m = /^43(\d+)(.*)$/.exec(raw);
        if (m) {
          const cb = pending.get(Number(m[1]));
          pending.delete(Number(m[1]));
          if (cb) cb(JSON.parse(m[2])[0]);
        }
        return undefined;
      }
      if (raw.startsWith('42["message.new"')) {
        const [, msg] = JSON.parse(raw.slice(2));
        if (msg && msg.createdAt) deliverMs.add(Date.now() - Date.parse(msg.createdAt));
      }
      return undefined;
    });

    socket.setTimeout(() => socket.close(), HOLD_SEC * 1000);
  });
  check(res, { 'ws 101': (r) => r && r.status === 101 });
}
