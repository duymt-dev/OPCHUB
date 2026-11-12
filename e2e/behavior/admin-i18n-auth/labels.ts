import { readFileSync } from 'node:fs';
import { z } from 'zod';
export { CORE_LOCALES } from '../admin-i18n/core-labels';
import type { ControlLocale } from '../admin-i18n/control-labels';

const text = z.string().min(1);
const fields = <T extends readonly string[]>(keys: T) =>
  z.object(Object.fromEntries(keys.map((k) => [k, text])) as Record<T[number], typeof text>);
const authSchema = z.object({
  login: fields(['submit', 'email', 'password'] as const),
  firstPassword: fields(['title', 'newPassword', 'confirm', 'submit', 'cancel'] as const),
  twoFactor: fields(['title', 'code', 'submit', 'subOptional'] as const),
  totp: fields(['title', 'code', 'submit', 'back', 'errCode'] as const),
});
const commonSchema = z.object({
  shell: fields(['logout', 'profile'] as const),
  adminProfile: fields(['title', 'enable', 'enabled', 'name', 'email'] as const),
});
export function authLabels(locale: ControlLocale) {
  const bundle = locale === 'en-SG' ? 'en' : locale === 'ms-BN' ? 'ms' : locale;
  const raw = (file: string): unknown =>
    JSON.parse(
      readFileSync(
        new URL(`../../../apps/admin/messages/${bundle}/${file}.json`, import.meta.url),
        'utf8',
      ),
    ) as unknown;
  return {
    ...authSchema.parse(raw('auth')),
    ...commonSchema.parse(raw('common')),
    meta: fields(['login', 'firstPassword', 'twoFactor', 'profile'] as const).parse(raw('meta')),
    errors: z
      .object({ errors: fields(['adminPasswordRule', 'passwordMismatch'] as const) })
      .parse(raw('ui')).errors,
  };
}
export type AuthLabels = ReturnType<typeof authLabels>;
