import { createHmac } from 'node:crypto';
import { env } from '../env';

/**
 * BUG-036: token link huỷ nhận `base64url(email).HMAC_SHA256_hex(secret, 'unsub|' + email)`.
 * MSW ký bằng secret giả công khai (trùng `MOCK_UNSUBSCRIBE_SECRET` của packages/shared mock);
 * e2e server ký bằng `UNSUBSCRIBE_SECRET` — phải trùng giá trị trong `apps/server/.env`.
 */
const MOCK_SECRET = 'opchub-mock-unsubscribe-secret-0000000000';

export function unsubscribeToken(email: string): string {
  const secret = env.E2E_TARGET === 'server' ? env.UNSUBSCRIBE_SECRET : MOCK_SECRET;
  if (!secret)
    throw new Error('Thiếu UNSUBSCRIBE_SECRET cho e2e server — xem e2e/server/README.md');
  const e = email.trim().toLowerCase();
  const mac = createHmac('sha256', secret).update(`unsub|${e}`).digest('hex');
  return `${Buffer.from(e, 'utf8').toString('base64url')}.${mac}`;
}
