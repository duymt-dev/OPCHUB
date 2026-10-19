'use client';

import { ADMIN_AUTH_MESSAGES as MSG, isStrongAdminPassword } from '@opchub/shared/api';
import { useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { changeFirstPassword, logout } from '../api';
import { setupRouteOf } from '../setup-route';
import { AuthFrame } from './auth-frame';
import { SetupField } from './setup-field';
import styles from './setup.module.css';

type Errors = Partial<Record<'newPassword' | 'confirmPassword', string>>;

/** SEC-R01, AT-SEC01: phiên còn mật khẩu tạm → đặt mật khẩu mới trước khi vào Admin */
export function FirstPasswordScreen() {
  const t = useTranslations('auth.firstPassword');
  const router = useRouter();
  const toast = useToast();
  const me = useAuthStore((s) => s.me);
  const setSession = useAuthStore((s) => s.setSession);
  const signOut = useAuthStore((s) => s.signOut);
  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  if (!me) return null;

  const submit = async () => {
    // Cùng luật server (_cpSave prototype): lỗi tại ô, server vẫn kiểm lại
    if (!isStrongAdminPassword(pwd)) return setErrors({ newPassword: MSG.weakPassword });
    if (pwd !== confirm) return setErrors({ confirmPassword: MSG.mismatch });
    setErrors({});
    setBusy(true);
    try {
      const s = await changeFirstPassword({ newPassword: pwd, confirmPassword: confirm });
      setSession(s.accessToken, s.admin);
      toast(t('done'));
      router.replace(setupRouteOf(s.admin) ?? '/overview');
    } catch (e) {
      if (!(e instanceof ApiError)) throw e;
      const next: Errors = {};
      for (const f of e.fields) {
        if (f.path === 'newPassword' || f.path === 'confirmPassword') next[f.path] = f.message;
      }
      if (Object.keys(next).length) setErrors(next);
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

  return (
    <AuthFrame>
      <form
        className={styles.card}
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <h1 className={styles.title}>{t('title')}</h1>
        <p className={styles.sub}>{t.rich('sub', { email: me.email, b: (c) => <b>{c}</b> })}</p>
        <SetupField
          label={t('newPassword')}
          value={pwd}
          onChange={setPwd}
          placeholder={t('newPlaceholder')}
          autoComplete="new-password"
          error={errors.newPassword}
        />
        <SetupField
          label={t('confirm')}
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
          error={errors.confirmPassword}
        />
        <div className={styles.actions}>
          <button type="button" className={styles.btn} onClick={cancel}>
            {t('cancel')}
          </button>
          <button type="submit" className={styles.primary} disabled={busy}>
            {t('submit')}
          </button>
        </div>
      </form>
    </AuthFrame>
  );
}
