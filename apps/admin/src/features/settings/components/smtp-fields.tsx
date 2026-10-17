'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import type { Enc, SmtpForm } from '../hooks/use-smtp';
import styles from './smtp.module.css';

export type SmtpTextKey = Exclude<keyof SmtpForm, 'encryption' | 'enabled'>;

/** Nhãn + dấu * bắt buộc (prototype) bọc ô nhập */
export function Field({
  label,
  req,
  children,
}: {
  label: string;
  req?: boolean;
  children: ReactNode;
}) {
  return (
    <label className={styles.label}>
      <span>
        {req ? <span className={styles.req}>* </span> : null}
        {label}
      </span>
      {children}
    </label>
  );
}

/** Ô nhập 32px gắn với một khoá của form SMTP */
export function SmtpInput({
  form,
  k,
  onSet,
  placeholder,
  mono,
  type = 'text',
  className,
}: {
  form: SmtpForm;
  k: SmtpTextKey;
  onSet: (k: SmtpTextKey, v: string) => void;
  placeholder?: string | undefined;
  mono?: boolean;
  type?: string;
  className?: string | undefined;
}) {
  return (
    <input
      className={`${styles.input} ${mono ? styles.mono : ''} ${className ?? ''}`}
      value={form[k]}
      type={type}
      placeholder={placeholder}
      aria-label={placeholder}
      onChange={(e) => onSet(k, e.target.value)}
    />
  );
}

const ENCS: Enc[] = ['none', 'tls', 'ssl'];

/** Mã hoá: Không / STARTTLS (587) / SSL/TLS (465) — đổi cổng theo (prototype) */
export function EncSegment({ value, onChange }: { value: Enc; onChange: (e: Enc) => void }) {
  const t = useTranslations('settings.smtp');
  return (
    <div className={styles.encWrap}>
      {t('encryption')}
      <div className={styles.seg} role="radiogroup" aria-label={t('encryption')}>
        {ENCS.map((e) => (
          <button
            key={e}
            type="button"
            role="radio"
            aria-checked={value === e}
            className={`${styles.segItem} ${value === e ? styles.segOn : ''}`}
            onClick={() => onChange(e)}
          >
            {t(`enc.${e}`)}
          </button>
        ))}
      </div>
    </div>
  );
}
