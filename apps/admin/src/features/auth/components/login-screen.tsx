'use client';

import { demoAccounts } from '@opchub/shared/fixtures';
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
import { LOGIN_SSO, useLoginLabels } from './login-labels';
import { TotpStep } from './totp-step';
import { KEEP_SCROLL, leaveAuth } from '../keep-scroll';

/** TK dùng thử của prototype (`ACCOUNTS`): loại fixture → nhãn + màu thẻ */
const DEMO_KIND = {
  admin: { label: 'demoAdmin', tag: 'tagAdmin', tone: 'violet' },
  user: { label: 'demoUser', tag: 'tagUser', tone: 'blue' },
} as const;
/** A-01 Đăng nhập (Admin) */
export function LoginScreen() {
  const t = useTranslations('auth');
  const [localError, setLocalError] = useState<
    'errorEmpty' | NonNullable<ReturnType<typeof loginErrorKey>>['key']
  >();
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
    leaveAuth(() => router.replace(setup ?? next));
  };

  const labels = useLoginLabels();

  const onSubmit = async ({ identifier, password, remember }: LoginValues) => {
    if (!identifier.trim() || !password) {
      setLocalError('errorEmpty');
      return t('login.errorEmpty');
    }
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
      if ('raw' in err && err.raw) {
        setLocalError(undefined);
        return err.raw;
      }
      setLocalError(err.key);
      return t(`login.${err.key}`);
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
        formatError={(message) => (localError ? t(`login.${localError}`) : message)}
        labels={labels}
        sso={LOGIN_SSO}
        demoAccounts={accounts}
        notice={reason ? t(`login.reason.${reason}`) : undefined}
        onSubmit={onSubmit}
        onRegister={() => toast(t('login.registerOnPortal'))}
        onForgot={() => router.push('/forgot-password', KEEP_SCROLL)}
        onSso={() => toast(t('login.ssoAdmin'))}
      />
    </AuthFrame>
  );
}
