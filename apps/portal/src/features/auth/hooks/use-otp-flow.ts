'use client';

import { useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { resendOtp, verifyOtp } from '../api';
import { leaveAuth } from '../keep-scroll';

/** Sau kích hoạt vào thẳng cộng đồng (D-30) */
const AFTER_ACTIVATE = '/community';

/** Trạng thái hộp OTP: mở sau khi API đăng ký trả 202, xác thực xong thì đăng nhập luôn */
export function useOtpFlow() {
  const t = useTranslations('auth.otp');
  const toast = useToast();
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState<string>();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  const open = (to: string) => {
    setEmail(to);
    setCode('');
    setError(undefined);
    setSubmitting(false);
    setResending(false);
    toast(t('sent', { email: to }));
  };

  const close = () => {
    setEmail(undefined);
    setCode('');
    setError(undefined);
    setSubmitting(false);
    setResending(false);
  };

  const submit = async () => {
    if (!email || submitting) return;
    if (code.length !== 6) return setError(t('errLength'));
    setSubmitting(true);
    setError(undefined);
    try {
      const res = await verifyOtp({ email, code });
      setSession(res.accessToken, res.me);
      close();
      toast(t('activated', { email }));
      leaveAuth(() => router.replace(AFTER_ACTIVATE));
    } catch (e) {
      if (e instanceof ApiError && e.code === 'OTP_INVALID') return setError(t('errInvalid'));
      throw e;
    } finally {
      setSubmitting(false);
    }
  };

  const resend = async () => {
    if (!email || resending || submitting) return;
    setResending(true);
    setCode('');
    setError(undefined);
    try {
      await resendOtp(email);
      toast(t('resent', { email }));
    } finally {
      setResending(false);
    }
  };

  return {
    email,
    code,
    error,
    submitting,
    resending,
    open,
    close,
    submit,
    resend,
    setCode: (v: string) => {
      setCode(v);
      setError(undefined);
    },
  };
}
