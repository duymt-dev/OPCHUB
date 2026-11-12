'use client';

import { passwordScore } from '@opchub/shared/api-domains';
import { ResetPanel, useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { ApiError } from '@/lib/api-client';
import { useLocalErrors } from '@/i18n/use-local-errors';
import { resetPassword } from '../api';
import { AuthFrame } from './auth-frame';
import { KEEP_SCROLL } from '../keep-scroll';

const KEYS = [
  'back',
  'title',
  'sub',
  'newPassword',
  'newPasswordPlaceholder',
  'confirm',
  'confirmPlaceholder',
  'hint',
  'submit',
  'resend',
] as const;

/**
 * QT-02, BUG-001: đặt lại mật khẩu từ link trong mail (public, không qua AuthGate).
 * Thiếu token / server báo link hết hạn → khối lỗi + "Gửi lại liên kết"; mật khẩu yếu → báo tại ô.
 */
export function ResetScreen() {
  const t = useTranslations('auth');
  const router = useRouter();
  const toast = useToast();
  const token = useSearchParams().get('token') ?? '';
  const invalid = useLocalErrors<'link', 'missingToken'>(
    (key) => t(`reset.${key}`),
    token ? {} : { link: { kind: 'local', code: 'missingToken' } },
  );
  const fields = useLocalErrors<'newPassword' | 'confirm', 'errEmpty' | 'errMismatch'>((key) =>
    t(`reset.${key}`),
  );
  const [busy, setBusy] = useState(false);
  const labels = {
    ...(Object.fromEntries(KEYS.map((k) => [k, t(`reset.${k}`)])) as Record<
      (typeof KEYS)[number],
      string
    >),
    show: t('login.show'),
    hide: t('login.hide'),
  };

  const submit = async (newPassword: string, confirm: string) => {
    if (!newPassword) return fields.local({ newPassword: 'errEmpty' });
    if (newPassword !== confirm) return fields.local({ confirm: 'errMismatch' });
    fields.clear();
    setBusy(true);
    try {
      await resetPassword({ token, newPassword });
      toast(t('reset.done'));
      router.replace('/login');
    } catch (e) {
      if (!(e instanceof ApiError)) throw e;
      const field = e.fields.find((f) => f.path === 'newPassword');
      if (field) fields.raw({ newPassword: field.message });
      // Token sai định dạng (zod) → cùng thông điệp link không hợp lệ như server
      else if (e.status === 400) {
        if (e.fields.length) invalid.local({ link: 'missingToken' });
        else invalid.raw({ link: e.message });
      } else toast(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthFrame>
      <ResetPanel
        labels={labels}
        strengthOf={passwordScore}
        invalid={invalid.errors.link}
        fieldErrors={fields.errors}
        busy={busy}
        onSubmit={(p, c) => void submit(p, c)}
        onResend={() => router.push('/forgot-password', KEEP_SCROLL)}
        onBack={() => router.push('/login', KEEP_SCROLL)}
      />
    </AuthFrame>
  );
}
