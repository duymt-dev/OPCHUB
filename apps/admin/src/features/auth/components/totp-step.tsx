'use client';

import type { AdminLoginResponse } from '@opchub/shared/api';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ApiError } from '@/lib/api-client';
import { verifyTotp } from '../api';
import { SetupField } from './setup-field';
import styles from './setup.module.css';

/** D-27 bước 2 (SEC-R02): TK đã bật 2FA — nhập mã 6 số sau mật khẩu */
export function TotpStep({
  mfaToken,
  onDone,
  onBack,
}: {
  mfaToken: string;
  onDone: (s: AdminLoginResponse) => void;
  onBack: () => void;
}) {
  const t = useTranslations('auth.totp');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!/^\d{6}$/.test(code)) return setError(t('errCode'));
    setBusy(true);
    try {
      onDone(await verifyTotp(mfaToken, code));
    } catch (e) {
      if (!(e instanceof ApiError)) throw e;
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form
      className={styles.card}
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <button type="button" className={styles.link} onClick={onBack}>
        {t('back')}
      </button>
      <h1 className={styles.title}>{t('title')}</h1>
      <p className={styles.sub}>{t('sub')}</p>
      <SetupField
        label={t('code')}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        value={code}
        onChange={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
        error={error}
      />
      <div className={styles.actions}>
        <button type="submit" className={styles.primary} disabled={busy}>
          {t('submit')}
        </button>
      </div>
    </form>
  );
}
