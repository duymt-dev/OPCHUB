'use client';

import { useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { logout } from '../api';
import { AuthFrame } from './auth-frame';
import { TwoFactorForm } from './two-factor-form';

/** SEC-R02: "Bắt buộc 2FA cho quản trị viên" bật mà TK chưa có → thiết lập trước khi vào Admin */
export function TwoFactorScreen() {
  const t = useTranslations('auth.twoFactor');
  const router = useRouter();
  const toast = useToast();
  const me = useAuthStore((s) => s.me);
  const setSession = useAuthStore((s) => s.setSession);
  const signOut = useAuthStore((s) => s.signOut);
  if (!me) return null;
  return (
    <AuthFrame>
      <TwoFactorForm
        required={me.twoFactorRequired}
        onDone={(s) => {
          setSession(s.accessToken, s.admin);
          toast(t('done'));
          router.replace('/overview');
        }}
        onCancel={() => {
          void logout().catch(() => undefined);
          signOut();
          router.replace('/login');
        }}
      />
    </AuthFrame>
  );
}
