'use client';

import { isStrongAdminPassword } from '@opchub/shared/api';
import { useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { useLocalErrors } from '@/i18n/use-local-errors';
import { changeFirstPassword, logout } from '../api';
import { setupRouteOf } from '../setup-route';
import { navigateAfterAdminAuth } from '../navigate-after-auth';

type Field = 'newPassword' | 'confirmPassword';
type Code = 'adminPasswordRule' | 'passwordMismatch';

export function useFirstPassword() {
  const t = useTranslations('auth.firstPassword');
  const validation = useTranslations('ui');
  const errors = useLocalErrors<Field, Code>((code) => validation(`errors.${code}`));
  const router = useRouter();
  const toast = useToast();
  const setSession = useAuthStore((s) => s.setSession);
  const signOut = useAuthStore((s) => s.signOut);
  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!isStrongAdminPassword(pwd)) return errors.local({ newPassword: 'adminPasswordRule' });
    if (pwd !== confirm) return errors.local({ confirmPassword: 'passwordMismatch' });
    errors.clear();
    setBusy(true);
    try {
      const s = await changeFirstPassword({ newPassword: pwd, confirmPassword: confirm });
      setSession(s.accessToken, s.admin);
      toast(t('done'));
      navigateAfterAdminAuth(router, setupRouteOf(s.admin), '/overview');
    } catch (e) {
      if (!(e instanceof ApiError)) throw e;
      const next: Partial<Record<Field, string>> = {};
      for (const f of e.fields) {
        if (f.path === 'newPassword' || f.path === 'confirmPassword') next[f.path] = f.message;
      }
      if (Object.keys(next).length) errors.raw(next);
      else toast(e.message);
    } finally {
      setBusy(false);
    }
  };
  const cancel = () => {
    void logout().catch(() => undefined);
    signOut();
    router.replace('/login');
  };
  return { pwd, setPwd, confirm, setConfirm, errors: errors.errors, busy, submit, cancel };
}
