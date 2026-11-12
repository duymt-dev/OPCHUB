import { readFileSync } from 'node:fs';
import { z } from 'zod';
import type { ControlLocale } from '../admin-i18n/control-labels';

const text = z.string().min(1);
const fields = <T extends readonly string[]>(keys: T) =>
  z.object(Object.fromEntries(keys.map((key) => [key, text])) as Record<T[number], typeof text>);
const auth = z.object({
  login: fields(['forgot', 'email'] as const),
  forgot: fields(['title', 'sub', 'submit', 'back', 'errEmail'] as const),
  reset: fields([
    'title',
    'sub',
    'submit',
    'back',
    'newPassword',
    'confirm',
    'errEmpty',
    'errMismatch',
    'missingToken',
    'resend',
  ] as const),
});
export function passwordLabels(locale: ControlLocale) {
  const bundle = locale === 'en-SG' ? 'en' : locale === 'ms-BN' ? 'ms' : locale;
  const raw = (name: string): unknown =>
    JSON.parse(
      readFileSync(
        new URL(`../../../apps/admin/messages/${bundle}/${name}.json`, import.meta.url),
        'utf8',
      ),
    ) as unknown;
  return {
    ...auth.parse(raw('auth')),
    meta: fields(['forgotPassword', 'resetPassword'] as const).parse(raw('meta')),
  };
}
