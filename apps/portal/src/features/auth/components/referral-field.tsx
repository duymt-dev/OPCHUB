'use client';

import { Field, TextInput } from '@opchub/ui';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useId } from 'react';
import type { RegisterCommon } from '../hooks/use-register-common';
import type { RegErr } from './register-common-fields';
import styles from './referral-field.module.css';

export function ReferralField({ f, err }: { f: RegisterCommon; err?: RegErr }) {
  const t = useTranslations('auth.register');
  const { token } = theme.useToken();
  const id = useId();
  // Prototype v4 hiện lỗi mã ngay dưới ô (rgRefErr) — khác các ô khác chỉ toast
  const base = err?.('referralCode')?.text ? err('referralCode') : { id, text: f.referral.error };
  const error = base && { ...base, shown: true };
  return (
    <div className={styles.field}>
      <Field
        label={
          <span>
            {t('referral.title')} <span className={styles.optional}>{t('referral.optional')}</span>
          </span>
        }
        error={error}
      >
        <TextInput
          value={f.referral.code}
          onValue={f.referral.setCode}
          maxLength={12}
          placeholder={t('referral.placeholder')}
          autoComplete="off"
          className={styles.code}
          data-state={error?.text ? 'error' : f.referral.affiliateName ? 'valid' : undefined}
        />
        {f.referral.pending ? (
          <span className={styles.hint} style={{ color: token.colorTextTertiary }}>
            {t('referral.checking')}
          </span>
        ) : null}
        {f.referral.affiliateName ? (
          <span className={styles.hint} style={{ color: token.colorSuccessText }}>
            {t('referral.valid', { name: f.referral.affiliateName })}
          </span>
        ) : null}
      </Field>
    </div>
  );
}
