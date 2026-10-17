// §14.2 "Ngày cao điểm thu phí": 1.000 xác nhận CK/giờ; đối soát < 5 phút, không trùng kích hoạt.
// Gửi webhook FakeBank ký HMAC-SHA256 (header x-fake-signature) như ngân hàng thật. Mỗi giao dịch
// mang mã TV của một thành viên chờ phí (MEMBER_CODES, phân tách dấu phẩy); 10% gửi lặp lại cùng id
// để kiểm idempotent (không trùng kích hoạt). Chỉ chạy khi server BANK_PROVIDER=fake (dev/staging).
// BANK_WEBHOOK_SECRET truyền qua -e lúc chạy, không ghi vào repo.
import http from 'k6/http';
import crypto from 'k6/crypto';
import { check } from 'k6';
import { Trend } from 'k6/metrics';
import { API, requireEnv, uuid } from './lib.js';

const PER_HOUR = Number(__ENV.RATE_PER_HOUR || 1000);
const webhookMs = new Trend('webhook_ms', true);

export const options = {
  scenarios: {
    payments: {
      executor: 'constant-arrival-rate',
      rate: PER_HOUR,
      timeUnit: '1h',
      duration: __ENV.DURATION || '10m',
      preAllocatedVUs: 5,
      maxVUs: 20,
    },
  },
  thresholds: {
    http_req_failed: ['rate==0'],
    webhook_ms: ['p(95)<500'],
  },
};

const codes = (__ENV.MEMBER_CODES || '').split(',').filter(Boolean);
const AMOUNT = Number(__ENV.FEE_AMOUNT || 600000);
let last = null;

function send(body) {
  const raw = JSON.stringify(body);
  const sig = crypto.hmac('sha256', requireEnv('BANK_WEBHOOK_SECRET'), raw, 'hex');
  const r = http.post(`${API}/webhooks/bank`, raw, {
    headers: { 'Content-Type': 'application/json', 'x-fake-signature': sig },
    tags: { name: 'webhook' },
  });
  webhookMs.add(r.timings.duration);
  check(r, { 'webhook 2xx': (x) => x.status >= 200 && x.status < 300 });
}

export default function () {
  if (last && Math.random() < 0.1) {
    send(last); // giao dịch lặp (ngân hàng gửi lại) — server phải bỏ qua theo id
    return;
  }
  const code = codes.length ? codes[Math.floor(Math.random() * codes.length)] : 'TV000000';
  last = {
    id: `k6-${uuid()}`,
    amount: AMOUNT,
    content: `OPCHUB ${code} 09${Math.floor(Math.random() * 1e8)}`,
    receivedAt: new Date().toISOString(),
  };
  send(last);
}
