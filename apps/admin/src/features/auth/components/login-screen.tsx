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

/** A-01 Đăng nhập (Admin) */
export function LoginScreen() {
  const t = useTranslations('auth');
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'), '/overview');
  // NA-16 bước 4: phiên bị thu hồi → báo lý do (khoá, đổi mật khẩu, đổi quyền)
  const reason = parseEndReason(params.get('reason'));
  const toast = useToast();
  const setSession = useAuthStore((s) => s.setSession);

  const labels = Object.fromEntries(LABEL_KEYS.map((k) => [k, t(`login.${k}`)])) as Record<
    (typeof LABEL_KEYS)[number],
    string
  >;

  const onSubmit = async ({ identifier, password, remember }: LoginValues) => {
    if (!identifier.trim() || !password) return t('login.errorEmpty');
    try {
      const res = await login({ identifier, password, remember });
      if (res.me.systemRole === 'member') return t('login.errorWrongApp');
      setSession(res.accessToken, res.me);
      toast(t('login.welcomeAdmin'));
      router.replace(next);
      return undefined;
    } catch (e) {
      const err = loginErrorKey(e);
      if (!err) throw e;
      return err.key === 'errorRateLimited' ? err.raw : t(`login.${err.key}`);
    }
  };

  const accounts = showDemoAccounts
    ? demoAccounts.map((a) => ({
        label: a.role === 'admin' ? t('login.demoAdmin') : t('login.demoUser'),
        email: a.email,
        password: a.pwd,
        tag: a.role === 'admin' ? t('login.tagAdmin') : t('login.tagUser'),
        tone: a.role === 'admin' ? ('violet' as const) : ('blue' as const),
      }))
    : [];

  return (
    <AuthFrame>
      <LoginPanel
        labels={labels}
        sso={ssoProviders.map((s) => ({ id: s.id, name: s.name }))}
        demoAccounts={accounts}
        notice={reason ? t(`login.reason.${reason}`) : undefined}
        onSubmit={onSubmit}
        onRegister={() => toast(t('login.registerOnPortal'))}
        onForgot={() => router.push('/forgot-password')}
        onSso={() => toast(t('login.ssoAdmin'))}
      />
    </AuthFrame>
  );
}
