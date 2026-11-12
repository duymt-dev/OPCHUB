import { createHmac } from 'node:crypto';

/** Independent RFC6238 SHA1 oracle. Never persist/log the live fixture URI or secret. */
export function totp(uri: string, now = Date.now()): string {
  let url: URL;
  try {
    url = new URL(uri);
  } catch {
    throw new Error('Invalid TOTP setup contract');
  }
  const secret = url.searchParams.get('secret') ?? '';
  if (url.protocol !== 'otpauth:' || url.hostname !== 'totp' || !/^[A-Z2-7]+$/.test(secret))
    throw new Error('Invalid TOTP setup contract');
  if (
    (url.searchParams.get('period') ?? '30') !== '30' ||
    (url.searchParams.get('digits') ?? '6') !== '6' ||
    (url.searchParams.get('algorithm') ?? 'SHA1').toUpperCase() !== 'SHA1'
  )
    throw new Error('Unsupported TOTP setup contract');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bytes: number[] = [];
  let bits = 0,
    value = 0;
  for (const char of secret) {
    value = (value << 5) | alphabet.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(now / 30000)));
  const hash = createHmac('sha1', Buffer.from(bytes)).update(counter).digest();
  const offset = (hash[hash.length - 1] ?? 0) & 15;
  return String((hash.readUInt32BE(offset) & 0x7fffffff) % 1000000).padStart(6, '0');
}
