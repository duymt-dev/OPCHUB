'use client';

import { useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { resendOtp, verifyOtp } from '../api';

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

  const open = (to: string) => {
    setEmail(to);
    setCode('');
    setError(undefined);
    toast(t('sent', { email: to }));
  };

  const close = () => {
    setEmail(undefined);
    setCode('');
    setError(undefined);
  };

  const submit = async () => {
    if (!email) return;
    if (code.length !== 6) return setError(t('errLength'));
    try {
      const res = await verifyOtp({ email, code });
      setSession(res.accessToken, res.me);
      close();
      toast(t('activated', { email }));
      router.replace(AFTER_ACTIVATE);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'OTP_INVALID') return setError(t('errInvalid'));
      throw e;
    }
  };

  const resend = async () => {
    if (!email) return;
    setCode('');
    setError(undefined);
    await resendOtp(email);
    toast(t('resent', { email }));
  };

  return {
    email,
    code,
    error,
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
