import { expect, it } from 'vitest';
import { affiliateCode } from '@/modules/affiliate/domain/affiliate-code';
import { testMemberName } from '../factories/member-name';

it('persistent test members retain distinct alphabetic affiliate stems instead of one THU bucket', () => {
  const a = testMemberName('01234567-89ab-cdef-0123-456789abcdef');
  const b = testMemberName('98765432-10ab-cdef-0123-456789abcdef');
  expect(a).toBe('Người thử GHIJKLMNOPAB');
  expect(affiliateCode(a).slice(0, 6)).not.toBe(affiliateCode(b).slice(0, 6));
  expect(testMemberName('01234567-89ab-cdef-0123-456789abcdef')).toBe(a);
});
