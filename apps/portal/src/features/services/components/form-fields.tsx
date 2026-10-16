'use client';

import type { ReactNode } from 'react';
import type { ConsultField, ConsultForm } from '../types';
import styles from './consult-form.module.css';

/** Ô nhập / chọn dùng trong form tư vấn (bố cục nhãn 150px + ô, như prototype) */

export function Row({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={styles.row}>
      <span className={styles.label}>
        {label}
        {required ? <span className={styles.req}> *</span> : null}
      </span>
      <div className={styles.cell}>{children}</div>
    </div>
  );
}

export function Section({ children }: { children: ReactNode }) {
  return <div className={styles.section}>{children}</div>;
}

interface FieldProps {
  form: ConsultForm;
  name: ConsultField;
  set: (k: ConsultField, v: string) => void;
  label: string;
}

export function TextInput({
  form,
  name,
  set,
  label,
  placeholder,
}: FieldProps & { placeholder: string }) {
  return (
    <input
      className={styles.input}
      aria-label={label}
      value={form[name]}
      placeholder={placeholder}
      onChange={(e) => set(name, e.target.value)}
    />
  );
}

export function Select({
  form,
  name,
  set,
  label,
  placeholder,
  options,
}: FieldProps & { placeholder: string | null; options: readonly (string | [string, string])[] }) {
  return (
    <select
      className={styles.input}
      aria-label={label}
      value={form[name]}
      onChange={(e) => set(name, e.target.value)}
    >
      {placeholder !== null ? <option value="">{placeholder}</option> : null}
      {options.map((o) => {
        const [v, l] = Array.isArray(o) ? o : [o, o];
        return (
          <option key={v} value={v}>
            {l}
          </option>
        );
      })}
    </select>
  );
}

export function Pair({ children }: { children: ReactNode }) {
  return <div className={styles.pair}>{children}</div>;
}
