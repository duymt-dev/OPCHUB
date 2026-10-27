'use client';

import { FieldErrorOf, type FieldErrorProps, invalidProps } from '@opchub/ui';
import type { ReactNode } from 'react';
import type { ConsultError } from '../model';
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

/** `even`: prototype "NGƯỜI LIÊN HỆ" / "NHU CẦU" đệm 10px cả dưới (khối tổ chức / cá nhân 6px) */
export function Section({ children, even }: { children: ReactNode; even?: boolean }) {
  return <div className={`${styles.section} ${even ? styles.sectionEven : ''}`}>{children}</div>;
}

/** Lỗi tại ô (BUG-022); ô không có lỗi kiểm (`svc`, `web`…) → undefined */
export type ConsultErr = (k: ConsultError) => FieldErrorProps | undefined;

interface FieldProps {
  form: ConsultForm;
  name: ConsultField;
  set: (k: ConsultField, v: string) => void;
  label: string;
  err?: ConsultErr | undefined;
}

/** Ô có luật kiểm (khoá lỗi = tên ô); ô tự do (`svc`, `web`, `when`…) không bao giờ đỏ */
const CHECKED: ReadonlySet<string> = new Set<ConsultError>([
  'name',
  'phone',
  'email',
  'org',
  'orgType',
  'tax',
  'size',
  'pos',
  'job',
  'addr',
  'note',
]);
const isChecked = (name: ConsultField): name is ConsultError => CHECKED.has(name);
const errOf = (name: ConsultField, err: ConsultErr | undefined) =>
  err && isChecked(name) ? err(name) : undefined;

export function TextInput({
  form,
  name,
  set,
  label,
  placeholder,
  err,
}: FieldProps & { placeholder: string }) {
  const e = errOf(name, err);
  return (
    <>
      <input
        className={styles.input}
        aria-label={label}
        value={form[name]}
        placeholder={placeholder}
        {...invalidProps(e)}
        onChange={(ev) => set(name, ev.target.value)}
      />
      <FieldErrorOf e={e} />
    </>
  );
}

export function Select({
  form,
  name,
  set,
  label,
  placeholder,
  options,
  err,
}: FieldProps & { placeholder: string | null; options: readonly (string | [string, string])[] }) {
  const e = errOf(name, err);
  return (
    <>
      <select
        className={styles.input}
        aria-label={label}
        value={form[name]}
        {...invalidProps(e)}
        onChange={(ev) => set(name, ev.target.value)}
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
      <FieldErrorOf e={e} />
    </>
  );
}

export function Pair({ children }: { children: ReactNode }) {
  return <div className={styles.pair}>{children}</div>;
}

/** Một cột trong `Pair` (ô + chữ lỗi xếp dọc) */
export function PairCell({ children }: { children: ReactNode }) {
  return <div className={styles.pairCell}>{children}</div>;
}
