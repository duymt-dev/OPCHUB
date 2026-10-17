// OPCHUB k6 — tiện ích chung (TIP-B66). Chỉ dùng module có sẵn trong k6 (không npm).
// Mọi cấu hình qua biến môi trường `-e KEY=value`; không có secret mặc định trong repo.
import http from 'k6/http';
import { check, fail } from 'k6';

/** Gốc API, vd http://127.0.0.1:4000/v1 (dev) hoặc https://opchub.community/v1 */
export const API = __ENV.API_URL || 'http://127.0.0.1:4000/v1';
/** Gốc Socket.IO (engine.io), vd ws://127.0.0.1:4001 */
export const SOCKET = __ENV.SOCKET_URL || 'ws://127.0.0.1:4001';

export function requireEnv(name) {
  const v = __ENV[name];
  if (!v) fail(`thiếu biến môi trường ${name} (truyền bằng -e ${name}=...)`);
  return v;
}

export const jsonHeaders = (extra = {}) => ({
  'Content-Type': 'application/json',
  'X-Request-Id': uuid(),
  ...extra,
});

export function uuid() {
  // RFC 4122 v4 đủ dùng cho request id / idempotency key
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Đăng nhập → access token (dùng ở setup(), không đo vào ngưỡng) */
export function login(identifier, password) {
  const r = http.post(`${API}/auth/login`, JSON.stringify({ identifier, password }), {
    headers: jsonHeaders(),
    tags: { name: 'setup_login' },
  });
  if (!check(r, { 'login 200': (x) => x.status === 200 })) {
    fail(`đăng nhập ${identifier} thất bại: ${r.status}`);
  }
  return r.json('accessToken');
}

export const auth = (token, extra = {}) => ({
  headers: jsonHeaders({ Authorization: `Bearer ${token}`, ...extra }),
});

/** Số ngẫu nhiên n chữ số (SĐT giả, mã tạm) */
export function digits(n) {
  let s = '';
  for (let i = 0; i < n; i += 1) s += Math.floor(Math.random() * 10);
  return s;
}
