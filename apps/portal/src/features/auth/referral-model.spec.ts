import { describe, expect, it } from 'vitest';
import {
  initialReferral,
  normalizeReferral,
  referralCookie,
  referralFromCookie,
  validReferralLink,
} from './referral-model';

describe('Affiliate referral prefill (TIP-V2-403)', () => {
  it('REQ-303 URL > cookie > empty, URI decoding and exact cookie key', () => {
    expect(initialReferral('urlcode', 'opc_ref=COOKIE')).toBe('URLCODE');
    expect(initialReferral(null, 'x=1; opc_ref=opcan26; session=2')).toBe('OPCAN26');
    expect(initialReferral(null, '')).toBe('');
    expect(referralFromCookie('not_opc_ref=OTHER; opc_ref=%4fPCAN26')).toBe('OPCAN26');
    expect(referralFromCookie('opc_ref=%E0%A4%A')).toBe('');
  });
  it('REQ-303 code upper alphanumeric max12, invalid public links are not treated as valid codes', () => {
    expect(normalizeReferral('ab-_cd 1234567890')).toBe('ABCD12345678');
    expect(validReferralLink('OPCAN26')).toBe(true);
    for (const code of ['abc', 'AB!CD', 'A'.repeat(13), ''])
      expect(validReferralLink(code)).toBe(false);
  });
  it('REQ-303 TTL comes from policy, root path and SameSite=Lax, HTTPS adds Secure', () => {
    expect(referralCookie('opcan26', 45, true)).toBe(
      'opc_ref=OPCAN26; Max-Age=3888000; Path=/; SameSite=Lax; Secure',
    );
    expect(referralCookie('OPCAN26', 1, false)).toBe(
      'opc_ref=OPCAN26; Max-Age=86400; Path=/; SameSite=Lax',
    );
    expect(() => referralCookie('BAD!', 30, false)).toThrow();
  });
});
