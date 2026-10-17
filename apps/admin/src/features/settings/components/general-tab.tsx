'use client';

import { TIMEZONES, type GeneralSettings } from '@opchub/shared/api-domains';
import { useState } from 'react';
import { useGeneral } from '../hooks/use-general';
import { isEmail } from '../model';
import { LogoPicker } from './logo-picker';
import { OptionRow } from './switch';
import styles from './settings.module.css';

type TextKey = 'platformName' | 'domain' | 'contactEmail';

/** Ô chữ giữ giá trị đang gõ; lưu khi rời ô / Enter nếu đổi (không gọi API mỗi phím) */
function TextField({
  label,
  value,
  validate,
  onSave,
  onInvalid,
}: {
  label: string;
  value: string;
  validate: (v: string) => string | null;
  onSave: (v: string) => void;
  onInvalid: (msg: string) => void;
}) {
  const [text, setText] = useState(value);
  const commit = () => {
    const v = text.trim();
    if (v === value) return;
    const err = validate(v);
    if (err) {
      setText(value);
      return onInvalid(err);
    }
    onSave(v);
  };
  return (
    <label className={styles.field}>
      {label}
      <input
        className={styles.input42}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      />
    </label>
  );
}

function GeneralForm({ data }: { data: GeneralSettings }) {
  const { save, t, toast } = useGeneral();

  const required = (v: string) => (v ? null : t('required'));
  const text = (k: TextKey, label: string, validate = required) => (
    <TextField
      label={label}
      value={data[k]}
      validate={validate}
      onSave={(v) => save({ [k]: v }, t('saved'))}
      onInvalid={toast}
    />
  );

  const toggles = [
    ['openRegistration', 'open', 'openDesc'],
    ['otpVerification', 'otp', 'otpDesc'],
    ['requireProfile', 'profile', 'profileDesc'],
  ] as const;

  return (
    <>
      <section className={styles.card}>
        <div className={styles.head}>
          <div className={styles.h18}>{t('heading')}</div>
          <div className={styles.muted}>{t('headingSub')}</div>
        </div>
        <LogoPicker
          url={data.logoUrl}
          onChange={(u) => save({ logoUrl: u }, t(u ? 'logoSaved' : 'logoRemoved'))}
          onError={toast}
        />
        <div className={styles.grid240}>
          {text('platformName', t('name'))}
          {text('domain', t('domain'))}
          {text('contactEmail', t('email'), (v) => (isEmail(v) ? null : t('invalidEmail')))}
          <label className={styles.field}>
            {t('timezone')}
            <select
              className={styles.input42}
              value={data.timezone}
              onChange={(e) => {
                const tz = TIMEZONES.find((z) => z === e.target.value);
                if (tz) save({ timezone: tz }, t('saved'));
              }}
            >
              {TIMEZONES.map((z) => (
                <option key={z} value={z}>
                  {t(`tz.${z}`)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>
      <section className={styles.card}>
        <div className={styles.h18}>{t('registration')}</div>
        {toggles.map(([k, label, desc]) => (
          <OptionRow
            key={k}
            label={t(label)}
            desc={t(desc)}
            on={data[k]}
            onChange={(v) => save({ [k]: v }, t('saved'))}
          />
        ))}
      </section>
    </>
  );
}

/** D-66 "Chung": thông tin nền tảng + đăng ký & tham gia */
export function GeneralTab() {
  const { data } = useGeneral();
  return data ? <GeneralForm data={data} /> : null;
}
