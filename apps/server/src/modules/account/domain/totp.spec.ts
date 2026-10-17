import { describe, expect, it } from 'vitest';
import { base32, hotp, totpAt, verifyTotp } from './totp';

/** Vector chuẩn RFC 4226 phụ lục D / RFC 6238 phụ lục B (SHA-1) */
const secret = Buffer.from('12345678901234567890');

describe('TOTP RFC 6238', () => {
  it('HOTP khớp vector RFC 4226', () => {
    expect([0, 1, 2, 9].map((c) => hotp(secret, c))).toEqual([
      '755224',
      '287082',
      '359152',
      '520489',
    ]);
  });

  it('TOTP khớp vector RFC 6238 (6 số cuối)', () => {
    expect(totpAt(secret, new Date(59_000))).toBe('287082');
    expect(totpAt(secret, new Date(1_111_111_109_000))).toBe('081804');
  });

  it('chấp nhận lệch ±1 bước, từ chối ±2 và mã sai định dạng', () => {
    const at = new Date(1_700_000_000_000);
    const prev = totpAt(secret, new Date(at.getTime() - 30_000));
    expect(verifyTotp(secret, prev, at)).toBe(true);
    expect(verifyTotp(secret, totpAt(secret, new Date(at.getTime() - 60_000)), at)).toBe(false);
    expect(verifyTotp(secret, '12ab56', at)).toBe(false);
  });

  it('base32 theo RFC 4648', () => {
    expect(base32(Buffer.from('foobar'))).toBe('MZXW6YTBOI');
  });
});
