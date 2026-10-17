import { clientEvents, serverEvents } from '@opchub/shared/socket';
import type { ClientEventName } from '@opchub/shared/socket';
import { io, type Socket } from 'socket.io-client';
import type { z } from 'zod';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { env } from '@/lib/env';
import { restTransport, type ChatTransport } from './transport';

let socket: Socket | null = null;

/** Một kết nối cho cả tab; token lấy lúc (re)connect nên refresh xong tự dùng token mới */
function getSocket(): Socket {
  socket ??= io(env.NEXT_PUBLIC_SOCKET_URL ?? '', {
    transports: ['websocket'],
    auth: (cb) => cb({ token: useAuthStore.getState().accessToken ?? '' }),
  });
  return socket;
}

type AckOf<E extends ClientEventName> = z.infer<(typeof clientEvents)[E]['ack']>;
type DataOf<E extends ClientEventName> = Extract<AckOf<E>, { ok: true }>['data'];

/**
 * Parse payload theo hợp đồng trước khi gửi (vd emoji ngoài danh sách → lỗi ngay ở client),
 * emitWithAck, parse ack bằng zod; ack lỗi → ApiError cùng mã với REST.
 */
async function call<E extends ClientEventName>(event: E, input: unknown): Promise<DataOf<E>> {
  const def = clientEvents[event];
  const payload: unknown = def.payload.parse(input);
  const raw: unknown = await getSocket().timeout(10_000).emitWithAck(event, payload);
  const res = def.ack.parse(raw) as AckOf<E>;
  if (!res.ok) throw new ApiError(res.error.code, 0, res.error.message);
  return (res as Extract<AckOf<E>, { ok: true }>).data;
}

/** Transport Socket.IO (S-02, S-12) — dùng khi NEXT_PUBLIC_API_MOCKING=off */
export const socketTransport: ChatTransport = {
  send: (roomId, msg) => call('message.send', { ...msg, roomId }),
  react: (messageId, emoji) => call('message.react', { messageId, emoji }),
  pin: (messageId, pinned) => call('message.pin', { messageId, pinned }),
  join: (roomId, onMessage) => {
    const s = getSocket();
    const onEvent = (raw: unknown) => {
      const parsed = serverEvents['message.new'].safeParse(raw);
      if (parsed.success && parsed.data.roomId === roomId) onMessage(parsed.data);
    };
    const doJoin = () => void call('room.join', { roomId }).catch(() => undefined);
    s.on('message.new', onEvent);
    s.on('message.updated', onEvent);
    s.on('connect', doJoin);
    if (s.connected) doJoin();
    return () => {
      s.off('message.new', onEvent);
      s.off('message.updated', onEvent);
      s.off('connect', doJoin);
      void call('room.leave', { roomId }).catch(() => undefined);
    };
  },
};

/** MSW → REST (không có server đẩy); API thật → Socket.IO. Socket chỉ kết nối ở lần dùng đầu. */
export const defaultTransport: ChatTransport =
  env.NEXT_PUBLIC_API_MOCKING === 'msw' ? restTransport : socketTransport;
