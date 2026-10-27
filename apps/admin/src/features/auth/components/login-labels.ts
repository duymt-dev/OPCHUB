'use client';

import { LOGIN_SSO_IDS } from '@opchub/shared/api-domains';
import { ssoProviders } from '@opchub/shared/fixtures';
import type { LoginPanelProps } from '@opchub/ui';
import { useTranslations } from 'next-intl';

const LABEL_KEYS = [
  'title',
  'sub',
  'tabLogin',
  'tabRegister',
  'email',
  'emailPlaceholder',
  'password',
  'passwordPlaceholder',
  'show',
  'hide',
  'remember',
  'forgot',
  'submit',
  'orContinue',
  'noAccount',
  'registerLink',
  'demoTitle',
] as const;

/** Nhãn form đăng nhập A-01 — dùng cho màn đăng nhập và nền mờ sau hộp đổi mật khẩu lần đầu */
export function useLoginLabels(): LoginPanelProps['labels'] {
  const t = useTranslations('auth');
  return Object.fromEntries(LABEL_KEYS.map((k) => [k, t(`login.${k}`)])) as Record<
    (typeof LABEL_KEYS)[number],
    string
  >;
}

/** Nút SSO được bật ở Admin (D-89: chỉ Google) */
export const LOGIN_SSO = ssoProviders
  .filter((s) => (LOGIN_SSO_IDS as readonly string[]).includes(s.id))
  .map((s) => ({ id: s.id, name: s.name }));
