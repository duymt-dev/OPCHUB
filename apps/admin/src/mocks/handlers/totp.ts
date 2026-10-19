/**
 * TOTP RFC 6238 cho MSW (SHA-1, 6 số, 30 giây, lệch ±1 bước) — cùng thuật toán server
 * (`account/domain/totp.ts`) nên e2e tính mã từ liên kết otpauth chạy được cả hai bản (D-27).
 */

/** Khoá demo của MSW (base32) — mọi TK quản trị dùng chung khi thiết lập 2FA */
export const MOCK_TOTP_SECRET = 'JBSWY3DPEHPK3PXP';
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP_SEC = 30;

function decode(b32: string): Uint8Array<ArrayBuffer> {
  const out: number[] = [];
  let bits = 0;
  let value = 0;
  for (const ch of b32) {
    value = (value << 5) | B32.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

async function hotp(key: CryptoKey, counter: number): Promise<string> {
  const msg = new DataView(new ArrayBuffer(8));
  msg.setBigUint64(0, BigInt(counter));
  const h = new Uint8Array(await crypto.subtle.sign('HMAC', key, msg.buffer));
  const offset = (h[h.length - 1] ?? 0) & 0x0f;
  const bin = new DataView(h.buffer).getUint32(offset) & 0x7fffffff;
  return String(bin % 1_000_000).padStart(6, '0');
}

export async function verifyMockTotp(code: string, at = Date.now()): Promise<boolean> {
  if (!/^\d{6}$/.test(code)) return false;
  const key = await crypto.subtle.importKey(
    'raw',
    decode(MOCK_TOTP_SECRET),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const now = Math.floor(at / 1000 / STEP_SEC);
  const codes = await Promise.all([-1, 0, 1].map((d) => hotp(key, now + d)));
  return codes.includes(code);
}
