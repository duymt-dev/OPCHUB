'use client';

import { useTranslations } from 'next-intl';
import styles from './reply-panel.module.css';

interface Props {
  name: 'sampleSize' | 'delaySeconds';
  value: number;
  max: number;
  disabled: boolean;
  error?: string | undefined;
  onSave: (value: number) => void;
}

export function ReplyNumberField({ name, value, max, disabled, error, onSave }: Props) {
  const t = useTranslations('bots.replies');
  const id = `reply-${name}`;
  return (
    <label className={styles.field} htmlFor={id}>
      <span>{t(name)}</span>
      <input
        key={value}
        id={id}
        type="number"
        min={1}
        max={max}
        step={1}
        defaultValue={value}
        disabled={disabled}
        required
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        onBlur={(e) => {
          if (!e.currentTarget.reportValidity()) return;
          const next = e.currentTarget.valueAsNumber;
          if (next !== value) onSave(next);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
      />
      {error ? (
        <span id={`${id}-error`} className={styles.error}>
          {error}
        </span>
      ) : null}
    </label>
  );
}
