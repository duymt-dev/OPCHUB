'use client';

import { demoAccounts, ssoProviders } from '@opchub/shared/fixtures';
import { AuthLayout, LoginPanel, useToast } from '@opchub/ui';
import type { LoginValues } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { login } from '../api';
import { safeNext } from '../safe-next';
import { LoginHero } from './login-hero';

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

/** A-01 Đăng nhập (Portal) */
export function LoginScreen() {
  const t = useTranslations('auth');
  const router = useRouter();
  const next = safeNext(useSearchParams().get('next'), '/dashboard');
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
      if (res.me.systemRole !== 'member') return t('login.errorWrongApp');
      setSession(res.accessToken, res.me);
      toast(t('login.welcomeUser'));
      router.replace(next);
      return undefined;
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 400))
        return t('login.errorInvalid');
      throw e;
    }
  };

  return (
    <AuthLayout
      hero={<LoginHero />}
      supportText={t('support')}
      supportLink={t('contact')}
      supportHref="#"
      languageLabel={t('language')}
    >
      <LoginPanel
        labels={labels}
        sso={ssoProviders.map((s) => ({ id: s.id, name: s.name }))}
        demoAccounts={demoAccounts.map((a) => ({
          label: a.role === 'admin' ? t('login.demoAdmin') : t('login.demoUser'),
          email: a.email,
          password: a.pwd,
          tag: a.role === 'admin' ? t('login.tagAdmin') : t('login.tagUser'),
          tone: a.role === 'admin' ? 'violet' : 'blue',
        }))}
        onSubmit={onSubmit}
        onSso={(id) =>
          toast(t('login.ssoSoon', { name: ssoProviders.find((s) => s.id === id)?.name ?? id }))
        }
      />
    </AuthLayout>
  );
}
