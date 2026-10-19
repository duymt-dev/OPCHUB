'use client';

import type { Profile } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { profileKeys, requestEmailChange, verifyEmailChange } from '../api';
import { isEmail } from '../model';

type Step = 'closed' | 'email' | 'otp';

/**
 * BUG-030, QT-01: đổi email đăng nhập — nhập email mới → OTP gửi tới email mới → xác nhận.
 * Lỗi hiện ngay trong hộp (không toast) để người dùng sửa và gửi lại.
 */
export function useEmailChange() {
  const t = useTranslations('profile.emailChange');
  const toast = useToast();
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>('closed');
  const [newEmail, setNewEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();

  const messageOf = (e: unknown) =>
    e instanceof ApiError ? (e.fields[0]?.message ?? e.message) : t('failed');

  const send = useMutation({
    mutationFn: (to: string) => requestEmailChange(to),
    onSuccess: (r) => {
      setStep('otp');
      setCode('');
      setError(undefined);
      toast(t('sent', { email: r.email }));
    },
    onError: (e) => setError(messageOf(e)),
  });

  const verify = useMutation({
    mutationFn: () => verifyEmailChange({ newEmail: newEmail.trim(), code }),
    onSuccess: (p: Profile) => {
      qc.setQueryData(profileKeys.me(), p);
      const { accessToken, me, setSession } = useAuthStore.getState();
      if (accessToken && me) setSession(accessToken, { ...me, email: p.email });
      close();
      toast(t('changed', { email: p.email }));
    },
    onError: (e) =>
      setError(e instanceof ApiError && e.code === 'OTP_INVALID' ? t('errInvalid') : messageOf(e)),
  });

  function close() {
    setStep('closed');
    setNewEmail('');
    setCode('');
    setError(undefined);
  }

  return {
    step,
    newEmail,
    code,
    error,
    busy: send.isPending || verify.isPending,
    open: () => setStep('email'),
    close,
    setNewEmail: (v: string) => {
      setNewEmail(v);
      setError(undefined);
    },
    setCode: (v: string) => {
      setCode(v);
      setError(undefined);
    },
    sendCode: () => {
      if (!isEmail(newEmail)) return setError(t('errEmail'));
      send.mutate(newEmail.trim());
    },
    resend: () => send.mutate(newEmail.trim()),
    submit: () => {
      if (code.length !== 6) return setError(t('errLength'));
      verify.mutate();
    },
  };
}
export type EmailChange = ReturnType<typeof useEmailChange>;
