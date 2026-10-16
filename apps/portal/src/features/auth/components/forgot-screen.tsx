'use client';

import { ForgotPanel, LegalAndDemo, useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { showDemoAccounts } from '@/lib/env';
import { forgotPassword } from '../api';
import { AuthFrame } from './auth-frame';

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

/** Email điền sẵn như prototype — chỉ khi bật TK dùng thử (D-35) */
const DEMO_EMAIL = showDemoAccounts ? 'an.nguyen@mediasoft.vn' : '';

/** A-26 → A-28: quên mật khẩu */
export function ForgotScreen() {
  const t = useTranslations('auth');
  const router = useRouter();
  const toast = useToast();
  const [sentTo, setSentTo] = useState<string>();
  const [error, setError] = useState<string>();
  const labels = {
    ...(Object.fromEntries(KEYS.map((k) => [k, t(`forgot.${k}`)])) as Record<
      (typeof KEYS)[number],
      string
    >),
    email: t('login.email'),
  };

  const send = async (email: string) => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setError(t('forgot.errEmail'));
    setError(undefined);
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
        error={error}
        onSubmit={(e) => void send(e)}
        onBack={() => router.push('/login')}
      />
      <LegalAndDemo
        labels={{ terms: t('login.terms'), privacy: t('login.privacy'), demoTitle: '' }}
      />
    </AuthFrame>
  );
}
