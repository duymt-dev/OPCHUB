'use client';

import { demoAccounts, ssoProviders } from '@opchub/shared/fixtures';
import { LoginPanel, useToast } from '@opchub/ui';
import type { LoginValues } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { parseEndReason } from '@/lib/session-end';
import { showDemoAccounts } from '@/lib/env';
import { login } from '../api';
import { useRegistrationOpen } from '../hooks/use-registration-open';
import { useSso } from '../hooks/use-sso';
import { loginErrorKey } from '../login-messages';
import { safeNext } from '../safe-next';
import { AuthFrame } from './auth-frame';

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
  'terms',
  'privacy',
  'demoTitle',
] as const;

/** TK dùng thử của prototype (`ACCOUNTS`): loại fixture → nhãn + màu thẻ */
const DEMO_KIND = {
  admin: { label: 'demoAdmin', tag: 'tagAdmin', tone: 'violet' },
  user: { label: 'demoUser', tag: 'tagUser', tone: 'blue' },
} as const;
/** A-01 → A-09 Đăng nhập (Portal) */
export function LoginScreen() {
  const t = useTranslations('auth');
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'), '/dashboard');
  // NA-16 bước 4: phiên bị thu hồi → báo lý do (khoá, đổi mật khẩu, đổi quyền)
  const reason = parseEndReason(params.get('reason'));
  const toast = useToast();
  const setSession = useAuthStore((s) => s.setSession);
  const goRegister = useRegistrationOpen();
  const sso = useSso();

  const labels = Object.fromEntries(LABEL_KEYS.map((k) => [k, t(`login.${k}`)])) as Record<
    (typeof LABEL_KEYS)[number],
    string
  >;

  const onSubmit = async ({ identifier, password, remember }: LoginValues) => {
    if (!identifier.trim() || !password) return t('login.errorEmpty');
    try {
      const res = await login({ identifier, password, remember });
      setSession(res.accessToken, res.me);
      toast(t('login.welcomeUser'));
      router.replace(next);
      return undefined;
    } catch (e) {
      const err = loginErrorKey(e);
      if (!err) throw e;
      return err.key === 'errorRateLimited' ? err.raw : t(`login.${err.key}`);
    }
  };

  // BUG-042: nhãn/màu TK dùng thử tra theo loại fixture, không so tên vai trò
  const accounts = showDemoAccounts
    ? demoAccounts.map((a) => {
        const d = DEMO_KIND[a.role];
        return {
          label: t(`login.${d.label}`),
          email: a.email,
          password: a.pwd,
          tag: t(`login.${d.tag}`),
          tone: d.tone,
        };
      })
    : [];

  return (
    <AuthFrame>
      <LoginPanel
        labels={labels}
        sso={ssoProviders.map((s) => ({ id: s.id, name: s.name }))}
        demoAccounts={accounts}
        notice={reason ? t(`login.reason.${reason}`) : undefined}
        onSubmit={onSubmit}
        onRegister={goRegister}
        onForgot={() => router.push('/forgot-password')}
        onSso={sso}
      />
    </AuthFrame>
  );
}
