'use client';

import { ADMIN_AUTH_MESSAGES as MSG, isStrongAdminPassword } from '@opchub/shared/api';
import { LoginPanel, useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { changeFirstPassword, logout } from '../api';
import { setupRouteOf } from '../setup-route';
import { AuthFrame } from './auth-frame';
import { LOGIN_SSO, useLoginLabels } from './login-labels';
import { SetupField } from './setup-field';
import dialog from './first-password.module.css';
import styles from './setup.module.css';

type Errors = Partial<Record<'newPassword' | 'confirmPassword', string>>;

const noSubmit = () => Promise.resolve(undefined);

/** Nền màn đăng nhập A-01 phía sau hộp thoại — chỉ để nhìn, không thao tác được */
function LoginBackdrop() {
  return (
    <div className={dialog.backdrop} inert aria-hidden>
      <LoginPanel labels={useLoginLabels()} sso={LOGIN_SSO} demoAccounts={[]} onSubmit={noSubmit} />
    </div>
  );
}

/** Gửi mật khẩu mới / hủy phiên hạn chế (lỗi tại ô như `_cpSave` prototype) */
function useFirstPassword() {
  const t = useTranslations('auth.firstPassword');
  const router = useRouter();
  const toast = useToast();
  const setSession = useAuthStore((s) => s.setSession);
  const signOut = useAuthStore((s) => s.signOut);
  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
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

  return { pwd, setPwd, confirm, setConfirm, errors, busy, submit, cancel };
}

/** SEC-R01, AT-SEC01: phiên còn mật khẩu tạm → đặt mật khẩu mới trước khi vào Admin.
 * Prototype v4 (`cpOpen`): hộp thoại nổi trên màn đăng nhập; route riêng giữ phiên hạn chế. */
export function FirstPasswordScreen() {
  const t = useTranslations('auth.firstPassword');
  const me = useAuthStore((s) => s.me);
  const f = useFirstPassword();
  if (!me) return null;

  return (
    <AuthFrame>
      <LoginBackdrop />
      <div className={dialog.mask} />
      <form
        className={`${styles.card} ${dialog.dialog}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="first-password-title"
        onSubmit={(e) => {
          e.preventDefault();
          void f.submit();
        }}
      >
        <div className={dialog.head}>
          <h1 id="first-password-title" className={styles.title}>
            {t('title')}
          </h1>
          <p className={styles.sub}>{t.rich('sub', { email: me.email, b: (c) => <b>{c}</b> })}</p>
        </div>
        <SetupField
          label={t('newPassword')}
          value={f.pwd}
          onChange={f.setPwd}
          placeholder={t('newPlaceholder')}
          autoComplete="new-password"
          error={f.errors.newPassword}
        />
        <SetupField
          label={t('confirm')}
          value={f.confirm}
          onChange={f.setConfirm}
          autoComplete="new-password"
          error={f.errors.confirmPassword}
        />
        <div className={styles.actions}>
          <button type="button" className={styles.btn} onClick={f.cancel}>
            {t('cancel')}
          </button>
          <button type="submit" className={styles.primary} disabled={f.busy}>
            {t('submit')}
          </button>
        </div>
      </form>
    </AuthFrame>
  );
}
