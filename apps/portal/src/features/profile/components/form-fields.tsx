'use client';

import type { ReactNode } from 'react';
import styles from './profile.module.css';

/** Ô nhập của form hồ sơ — cùng số đo prototype (cao 36, viền #D9D9D9) */

export function Field({
  label,
  badge,
  children,
}: {
  label: string;
  /** Huy hiệu nhỏ cạnh nhãn (VD: xác minh DN — D-40) */
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className={styles.field}>
      {badge ? (
        <span className={styles.labelRow}>
          {label}
          {badge}
        </span>
      ) : (
        label
      )}
      {children}
    </label>
  );
}

interface TextProps {
  value: string;
  onValue: (v: string) => void;
  placeholder?: string | undefined;
  type?: 'text' | 'email' | 'password';
  readOnly?: boolean | undefined;
}

export function TextInput({ value, onValue, placeholder, type = 'text', readOnly }: TextProps) {
  return (
    <input
      className={styles.input}
      type={type}
      value={value}
      placeholder={placeholder}
      readOnly={readOnly}
      onChange={(e) => onValue(e.target.value)}
    />
  );
}

interface SelectProps {
  value: string;
  onValue: (v: string) => void;
  options: { value: string; label: string }[];
  ariaLabel?: string | undefined;
  className?: string | undefined;
}

export function SelectInput({ value, onValue, options, ariaLabel, className }: SelectProps) {
  return (
    <select
      className={className ?? styles.select}
      value={value}
      aria-label={ariaLabel}
      onChange={(e) => onValue(e.target.value)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/** Danh sách chọn có giữ giá trị hiện tại kể cả khi ngoài danh mục */
export const optionsOf = (list: readonly string[], current: string) =>
  (current && !list.includes(current) ? [current, ...list] : list).map((v) => ({
    value: v,
    label: v,
  }));

export function FormActions({
  resetLabel,
  saveLabel,
  busy,
  onReset,
  onSave,
}: {
  resetLabel: string;
  saveLabel: string;
  busy: boolean;
  onReset: () => void;
  onSave: () => void;
}) {
  return (
    <div className={styles.actions}>
      <button type="button" className={styles.btn} onClick={onReset}>
        {resetLabel}
      </button>
      <button type="button" className={styles.primary} disabled={busy} onClick={onSave}>
        {saveLabel}
      </button>
    </div>
  );
}
