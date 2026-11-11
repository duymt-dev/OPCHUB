import { ADMIN_AUTH_MESSAGES } from '@opchub/shared/api';
import type { ZodIssue } from 'zod';

export type LocalIssueKey =
  | 'invalid'
  | 'required'
  | 'minLength'
  | 'maxLength'
  | 'adminPasswordRule'
  | 'passwordMismatch'
  | 'passwordSame'
  | 'currentPasswordRequired'
  | 'confirmPasswordRequired'
  | 'newPasswordRequired'
  | 'nameMin'
  | 'nameMax'
  | 'phoneMax'
  | 'avatarUrl'
  | 'minNumber'
  | 'maxNumber'
  | 'integer'
  | 'bankAccountNumber'
  | 'bankHolderLetters';
export type LocalIssueTranslator = (
  key: LocalIssueKey,
  values?: { min?: number; max?: number },
) => string;

/** Exact known custom messages only. Never translate arbitrary API/server/user strings. */
const CUSTOM_KEYS = new Map<string, LocalIssueKey>([
  [ADMIN_AUTH_MESSAGES.weakPassword, 'adminPasswordRule'],
  [ADMIN_AUTH_MESSAGES.mismatch, 'passwordMismatch'],
  ['Mật khẩu mới phải khác mật khẩu hiện tại', 'passwordSame'],
  ['Số tài khoản gồm 6–20 chữ số', 'bankAccountNumber'],
  ['Tên chủ tài khoản chỉ gồm chữ cái', 'bankHolderLetters'],
]);

export function localIssueMessage(issue: ZodIssue, t: LocalIssueTranslator): string {
  const known = CUSTOM_KEYS.get(issue.message);
  if (known) return t(known);
  if (issue.code === 'custom') return t('invalid');
  const field = issue.path.length === 1 ? issue.path[0] : undefined;
  if (issue.code === 'invalid_type' && issue.expected === 'int') return t('integer');
  if (issue.code === 'too_small' && issue.origin === 'number' && issue.inclusive !== false)
    return t('minNumber', { min: Number(issue.minimum) });
  if (issue.code === 'too_big' && issue.origin === 'number' && issue.inclusive !== false)
    return t('maxNumber', { max: Number(issue.maximum) });
  if (issue.code === 'invalid_format' && issue.format === 'regex' && field === 'bankNo')
    return t('bankAccountNumber');
  if (issue.code === 'too_small' && issue.origin === 'string') {
    if (field === 'name' && issue.minimum === 2) return t('nameMin');
    if (issue.minimum === 1) {
      if (field === 'currentPassword') return t('currentPasswordRequired');
      if (field === 'confirmPassword') return t('confirmPasswordRequired');
      if (field === 'newPassword') return t('newPasswordRequired');
      return t('required');
    }
    return t('minLength', { min: Number(issue.minimum) });
  }
  if (issue.code === 'too_big' && issue.origin === 'string') {
    if (field === 'name' && issue.maximum === 100) return t('nameMax');
    if (field === 'phone' && issue.maximum === 30) return t('phoneMax');
    return t('maxLength', { max: Number(issue.maximum) });
  }
  if (issue.code === 'invalid_format' && issue.format === 'url' && field === 'avatarUrl')
    return t('avatarUrl');
  return t('invalid');
}
