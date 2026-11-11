import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createTranslator } from 'next-intl';
import { adminChangePasswordSchema, adminUpdateProfileSchema } from '@opchub/shared/api';
import source from '../../messages/vi/ui.json';
import english from '../../messages/en/ui.json';
import { localIssueMessage } from './validation';

const t = createTranslator({ locale: 'en', messages: english.errors });
const vi = createTranslator({ locale: 'vi', messages: source.errors });
const password = {
  currentPassword: 'Current1',
  newPassword: 'NewPass1',
  confirmPassword: 'NewPass1',
};

describe('D-141 AC824-10 structured local validation only', () => {
  it.each([
    [{ ...password, currentPassword: '' }, 'Please enter your current password'],
    [
      { ...password, newPassword: 'weak', confirmPassword: 'weak' },
      english.errors.adminPasswordRule,
    ],
    [{ ...password, confirmPassword: '' }, 'Please confirm your new password'],
    [{ ...password, confirmPassword: 'Mismatch1' }, english.errors.passwordMismatch],
    [
      { ...password, newPassword: 'Current1', confirmPassword: 'Current1' },
      english.errors.passwordSame,
    ],
  ])('does not weaken shared password validation: %o', (input, expected) => {
    const parsed = adminChangePasswordSchema.safeParse(input);
    expect(parsed.success).toBe(false);
    if (parsed.success) throw new Error('Expected validation issues');
    expect(parsed.error.issues.map((issue) => localIssueMessage(issue, t))).toContain(expected);
  });

  it.each([
    [{ name: 'A' }, 'nameMin'],
    [{ name: 'x'.repeat(101) }, 'nameMax'],
    [{ name: 'Name', phone: 'x'.repeat(31) }, 'phoneMax'],
    [{ name: 'Name', avatarUrl: 'not-a-url' }, 'avatarUrl'],
  ] as const)('retains name/phone/URL validation and Vietnamese wording: %o', (input, key) => {
    const parsed = adminUpdateProfileSchema.safeParse(input);
    if (parsed.success) throw new Error('Expected validation issues');
    const issue = parsed.error.issues[0];
    if (!issue) throw new Error('Missing issue');
    expect(localIssueMessage(issue, vi)).toBe(source.errors[key]);
    expect(localIssueMessage(issue, t)).toBe(english.errors[key]);
  });

  it('uses safe translated fallback for unknown custom/shape issues, never their raw message', () => {
    expect(
      localIssueMessage(
        { code: 'custom', path: ['name'], message: 'arbitrary private/raw text' },
        t,
      ),
    ).toBe(english.errors.invalid);
    const parsed = z.string().safeParse(42);
    if (parsed.success || !parsed.error.issues[0]) throw new Error('Expected issue');
    expect(localIssueMessage(parsed.error.issues[0], t)).toBe(english.errors.invalid);
  });

  it('keeps generic string limits and ignores numeric limits rather than calling them text lengths', () => {
    const short = z.string().min(3).safeParse('a');
    const long = z.string().max(4).safeParse('abcde');
    const number = z.number().min(5).safeParse(1);
    for (const [result, text] of [
      [short, 'Enter at least 3 characters'],
      [long, 'Enter no more than 4 characters'],
      [number, english.errors.invalid],
    ] as const) {
      if (result.success || !result.error.issues[0]) throw new Error('Expected issue');
      expect(localIssueMessage(result.error.issues[0], t)).toBe(text);
    }
  });
});
