'use client';

import { demoAccounts, ssoProviders } from '@opchub/shared/fixtures';
import { LoginPanel, useToast } from '@opchub/ui';
import type { LoginValues } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import type { AdminLoginResponse } from '@opchub/shared/api';
import { useAuthStore } from '@/lib/auth-store';
import { parseEndReason } from '@/lib/session-end';
import { showDemoAccounts } from '@/lib/env';
import { login } from '../api';
import { loginErrorKey, mfaTokenOf } from '../login-messages';
import { setupRouteOf } from '../setup-route';
import { safeNext } from '../safe-next';
import { AuthFrame } from './auth-frame';
import { TotpStep } from './totp-step';

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
  const [mfaToken, setMfaToken] = useState<string | null>(null);

  /** SEC-R01/R02: phiên hạn chế → màn thiết lập; đủ quyền → `next` */
  const enter = (res: AdminLoginResponse) => {
    setSession(res.accessToken, res.admin);
    const setup = setupRouteOf(res.admin);
    if (!setup) toast(t('login.welcomeAdmin'));
    router.replace(setup ?? next);
  };

  const labels = Object.fromEntries(LABEL_KEYS.map((k) => [k, t(`login.${k}`)])) as Record<
    (typeof LABEL_KEYS)[number],
    string
  >;

  const onSubmit = async ({ identifier, password, remember }: LoginValues) => {
    if (!identifier.trim() || !password) return t('login.errorEmpty');
    try {
      enter(await login({ identifier, password, remember }));
      return undefined;
    } catch (e) {
      // D-27: TK đã bật 2FA → server trả 401 kèm `mfaToken` (chưa phát phiên)
      const mfa = mfaTokenOf(e);
      if (mfa) {
        setMfaToken(mfa);
        return undefined;
      }
      const err = loginErrorKey(e);
      if (!err) throw e;
      return 'raw' in err && err.raw ? err.raw : t(`login.${err.key}`);
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

  if (mfaToken) {
    return (
      <AuthFrame>
        <TotpStep mfaToken={mfaToken} onDone={enter} onBack={() => setMfaToken(null)} />
      </AuthFrame>
    );
  }

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
