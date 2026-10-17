import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/** RFC 6238 TOTP (SHA-1, 6 số, bước 30 giây) — tương thích Google Authenticator (D-27) */
const STEP_SEC = 30;
const DIGITS = 6;
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export const newTotpSecret = (): Buffer => randomBytes(20);

export function base32(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

/** RFC 4226 HOTP cho bộ đếm `counter` */
export function hotp(secret: Buffer, counter: number): string {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const h = createHmac('sha1', secret).update(msg).digest();
  const offset = (h[h.length - 1] ?? 0) & 0x0f;
  const bin = h.readUInt32BE(offset) & 0x7fffffff;
  return String(bin % 10 ** DIGITS).padStart(DIGITS, '0');
}

export const totpAt = (secret: Buffer, at: Date) =>
  hotp(secret, Math.floor(at.getTime() / 1000 / STEP_SEC));

/** Chấp nhận lệch ±1 bước (đồng hồ điện thoại sai vài giây) */
export function verifyTotp(secret: Buffer, code: string, at: Date, window = 1): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  const now = Math.floor(at.getTime() / 1000 / STEP_SEC);
  let ok = false;
  for (let d = -window; d <= window; d += 1) {
    const expected = Buffer.from(hotp(secret, now + d));
    // Không thoát sớm — thời gian so sánh không phụ thuộc vị trí khớp
    if (timingSafeEqual(expected, Buffer.from(code))) ok = true;
  }
  return ok;
}

export const otpauthUrl = (secret: Buffer, account: string, issuer = 'OPC Hub') =>
  `otpauth://totp/${encodeURIComponent(`${issuer}:${account}`)}?secret=${base32(secret)}` +
  `&issuer=${encodeURIComponent(issuer)}&period=${STEP_SEC}&digits=${DIGITS}`;
