// §14.2 "Đăng ký + OTP đồng thời": 200 người/phút, p95 < 800ms, 0 lỗi.
// Mỗi vòng = POST /auth/register/personal → POST /auth/otp/verify (OTP cố định của môi trường dev/test,
// biến OTP_CODE; production không có OTP cố định — chạy kịch bản này chỉ trên dev/staging).
// Rate limit đăng ký theo IP (10/15 phút) chặn tải từ một máy: chạy với server đặt THROTTLE_DISABLED
// hoặc từ nhiều IP — xem README. GROUP_ID: id nhóm có thật (vd từ seed).
import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';
import { API, digits, jsonHeaders, requireEnv } from './lib.js';

const RATE = Number(__ENV.RATE_PER_MIN || 200);
const failed = new Counter('register_failed');

export const options = {
  scenarios: {
    register: {
      executor: 'constant-arrival-rate',
      rate: RATE,
      timeUnit: '1m',
      duration: __ENV.DURATION || '3m',
      preAllocatedVUs: 20,
      maxVUs: 100,
    },
  },
  thresholds: {
    'http_req_duration{name:register}': ['p(95)<800'],
    'http_req_duration{name:otp_verify}': ['p(95)<800'],
    http_req_failed: ['rate==0'],
    register_failed: ['count==0'],
  },
};

export default function () {
  const group = requireEnv('GROUP_ID');
  const otp = __ENV.OTP_CODE || '123456';
  const tag = `${Date.now().toString(36)}${digits(6)}`;
  const email = `k6-${tag}@load.opchub.test`;
  const reg = http.post(
    `${API}/auth/register/personal`,
    JSON.stringify({
      fullName: `Tải thử ${tag}`,
      phone: { country: 'vn', number: `09${digits(8)}` },
      email,
      password: 'Load@2026test',
      persona: 'founder',
      groupIds: [group],
    }),
    { headers: jsonHeaders(), tags: { name: 'register' } },
  );
  const okReg = check(reg, { 'register 202': (r) => r.status === 202 });
  if (!okReg) {
    failed.add(1);
    return;
  }
  const ver = http.post(`${API}/auth/otp/verify`, JSON.stringify({ email, code: otp }), {
    headers: jsonHeaders(),
    tags: { name: 'otp_verify' },
  });
  if (!check(ver, { 'otp 200': (r) => r.status === 200 })) failed.add(1);
}
