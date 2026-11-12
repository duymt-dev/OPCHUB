'use client';

import { LoginPanel } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/lib/auth-store';
import { AuthFrame } from './auth-frame';
import { LOGIN_SSO, useLoginLabels } from './login-labels';
import { useFirstPassword } from '../hooks/use-first-password';
import { SetupField } from './setup-field';
import dialog from './first-password.module.css';
import styles from './setup.module.css';

const noSubmit = () => Promise.resolve(undefined);

/** Nền màn đăng nhập A-01 phía sau hộp thoại — chỉ để nhìn, không thao tác được */
function LoginBackdrop() {
  return (
    <div className={dialog.backdrop} inert aria-hidden>
      <LoginPanel labels={useLoginLabels()} sso={LOGIN_SSO} demoAccounts={[]} onSubmit={noSubmit} />
    </div>
  );
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
