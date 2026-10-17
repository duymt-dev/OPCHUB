import { createHmac, timingSafeEqual } from 'node:crypto';

/** HMAC-SHA256 hex (security.md › Webhook ngân hàng) */
export const signBody = (secret: string, rawBody: Buffer | string): string =>
  createHmac('sha256', secret).update(rawBody).digest('hex');

/** So sánh hằng thời gian; độ dài khác hoặc chuỗi không phải hex → false */
export function verifySignature(
  secret: string,
  rawBody: Buffer,
  signature: string | undefined,
): boolean {
  if (!signature || !/^[0-9a-f]+$/i.test(signature)) return false;
  const expected = Buffer.from(signBody(secret, rawBody), 'hex');
  const got = Buffer.from(signature, 'hex');
  return got.length === expected.length && timingSafeEqual(got, expected);
}
