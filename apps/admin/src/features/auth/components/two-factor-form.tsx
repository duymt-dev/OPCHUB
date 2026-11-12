'use client';

import type { AdminLoginResponse } from '@opchub/shared/api';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ApiError } from '@/lib/api-client';
import { useLocalErrors } from '@/i18n/use-local-errors';
import { enableTwoFactor, setupTwoFactor } from '../api';
import { SetupField } from './setup-field';
import styles from './setup.module.css';

/**
 * SEC-R02, D-27: tạo khoá TOTP rồi bật bằng mã 6 số. Repo chưa có thư viện QR → hiện liên kết
 * otpauth để dán vào ứng dụng xác thực (TIP-V2-204 cho phép, ghi report).
 */
export function TwoFactorForm({
  required,
  onDone,
  onCancel,
}: {
  required: boolean;
  onDone: (s: AdminLoginResponse) => void;
  onCancel: () => void;
}) {
  const t = useTranslations('auth.twoFactor');
  const tTotp = useTranslations('auth.totp');
  const setup = useQuery({
    queryKey: ['admin-2fa-setup'],
    queryFn: setupTwoFactor,
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
  });
  const [code, setCode] = useState('');
  const error = useLocalErrors<'code', 'errCode'>((key) => tTotp(key));
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!/^\d{6}$/.test(code)) return error.local({ code: 'errCode' });
    setBusy(true);
    try {
      onDone(await enableTwoFactor(code));
    } catch (e) {
      if (!(e instanceof ApiError)) throw e;
      error.raw({ code: e.fields.find((f) => f.path === 'code')?.message ?? e.message });
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
      <h1 className={styles.title}>{t('title')}</h1>
      <p className={styles.sub}>{required ? t('sub') : t('subOptional')}</p>
      {setup.data ? (
        <>
          <span className={styles.sub}>{t('secret')}</span>
          <code className={styles.code} data-testid="totp-secret">
            {setup.data.secretMasked}
          </code>
          <span className={styles.sub}>{t('uri')}</span>
          <code className={styles.code} data-testid="totp-uri">
            {setup.data.otpauthUrl}
          </code>
        </>
      ) : (
        <p className={styles.sub}>
          {setup.error instanceof Error ? setup.error.message : t('loading')}
        </p>
      )}
      <SetupField
        label={t('code')}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder={t('codePlaceholder')}
        value={code}
        onChange={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
        error={error.errors.code}
      />
      <div className={styles.actions}>
        <button type="button" className={styles.btn} onClick={onCancel}>
          {t('cancel')}
        </button>
        <button type="submit" className={styles.primary} disabled={busy || !setup.data}>
          {t('submit')}
        </button>
      </div>
    </form>
  );
}
