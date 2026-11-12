'use client';

import { ForgotPanel, useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { env, showDemoAccounts } from '@/lib/env';
import { forgotPassword } from '../api';
import { AuthFrame } from './auth-frame';
import { KEEP_SCROLL } from '../keep-scroll';

const KEYS = [
  'back',
  'title',
  'sub',
  'submit',
  'sentTitle',
  'sentLead',
  'sentTail',
  'toLogin',
  'resend',
] as const;

/** Email điền sẵn như prototype (ver2 vẫn điền sẵn) — MSW hoặc khi bật TK dùng thử (D-35) */
const DEMO_EMAIL =
  env.NEXT_PUBLIC_API_MOCKING === 'msw' || showDemoAccounts ? 'admin@opchub.community' : '';

/** A-26 → A-28: quên mật khẩu (Admin) */
export function ForgotScreen() {
  const t = useTranslations('auth');
  const router = useRouter();
  const toast = useToast();
  const [sentTo, setSentTo] = useState<string>();
  const [invalidEmail, setInvalidEmail] = useState(false);
  const labels = {
    ...(Object.fromEntries(KEYS.map((k) => [k, t(`forgot.${k}`)])) as Record<
      (typeof KEYS)[number],
      string
    >),
    email: t('login.email'),
  };

  const send = async (email: string) => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setInvalidEmail(true);
    setInvalidEmail(false);
    await forgotPassword(email.trim());
    setSentTo(email.trim());
    toast(t('forgot.toast'));
  };

  return (
    <AuthFrame>
      <ForgotPanel
        labels={labels}
        defaultEmail={useSearchParams().get('email') ?? DEMO_EMAIL}
        sentTo={sentTo}
        error={invalidEmail ? t('forgot.errEmail') : undefined}
        onSubmit={(e) => void send(e)}
        onBack={() => router.push('/login', KEEP_SCROLL)}
      />
    </AuthFrame>
  );
}
