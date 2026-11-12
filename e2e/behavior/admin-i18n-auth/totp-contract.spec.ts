import { test, expect } from '@playwright/test';
import { totp } from './totp';

// RFC6238 Appendix B SHA1 vectors reduced to six digits, NOT a live credential.
// https://www.rfc-editor.org/rfc/rfc6238.html#appendix-B
const uri = 'otpauth://totp/RFC6238?secret=GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
for (const [seconds, expected] of [
  [59, '287082'],
  [1111111109, '081804'],
  [20000000000, '353130'],
] as const)
  test(`D-141 AC824-04 RFC6238 six digits at ${seconds}`, () => {
    expect(totp(uri, seconds * 1000)).toBe(expected);
  });
test('D-141 AC824-04 rejects non-TOTP and unsupported parameters', () => {
  expect(() => totp('https://example.invalid')).toThrow('Invalid TOTP setup contract');
  expect(() => totp(uri + '&digits=8')).toThrow('Unsupported TOTP setup contract');
});
