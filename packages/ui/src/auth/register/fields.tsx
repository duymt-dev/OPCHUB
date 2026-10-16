'use client';

import { useState } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { Icon } from '../../icons';
import styles from './register.module.css';

/** Khung form đăng ký: các trường cách nhau 14px */
export function RegisterForm({ children }: { children: ReactNode }) {
  return <div className={styles.form}>{children}</div>;
}

export function SectionTitle({ children, gap }: { children: ReactNode; gap?: boolean }) {
  return <div className={`${styles.section} ${gap ? styles.sectionGap : ''}`}>{children}</div>;
}

interface FieldProps {
  label: ReactNode;
  required?: boolean | undefined;
  /** Tag xanh cạnh nhãn (VD: "Tự động từ MST") */
  tag?: string | undefined;
  /** Dòng chữ xanh lá dưới ô (VD: đã tra thấy MST) */
  note?: string | undefined;
  full?: boolean | undefined;
  children: ReactNode;
}

/** Nhãn + ô nhập; dấu * đỏ khi bắt buộc */
export function Field({ label, required, tag, note, full, children }: FieldProps) {
  const head = required ? (
    <span>
      {label} <span className={styles.req}>*</span>
    </span>
  ) : (
    label
  );
  return (
    <label className={`${styles.field} ${full ? styles.full : ''}`}>
      {tag ? (
        <span className={styles.labelRow}>
          {head}
          <span className={styles.autoTag}>{tag}</span>
        </span>
      ) : (
        head
      )}
      {children}
      {note ? <span className={styles.found}>{note}</span> : null}
    </label>
  );
}

type TextProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> & {
  value: string;
  onValue: (v: string) => void;
};

export function TextInput({ value, onValue, className, ...rest }: TextProps) {
  return (
    <input
      {...rest}
      className={`${styles.input} ${className ?? ''}`}
      value={value}
      onChange={(e) => onValue(e.target.value)}
    />
  );
}

export interface SelectOption {
  value: string;
  label: string;
}

export function SelectInput({
  options,
  value,
  onValue,
  ...rest
}: {
  options: SelectOption[];
  value: string;
  onValue: (v: string) => void;
  'aria-label'?: string;
}) {
  return (
    <select
      {...rest}
      className={styles.select}
      value={value}
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

interface PasswordProps {
  value: string;
  onValue: (v: string) => void;
  placeholder: string;
  showLabel: string;
  hideLabel: string;
  /** Có icon khóa + thanh độ mạnh + gợi ý (form cá nhân) */
  strength?: { hint: string; level: number };
}

/** Ô mật khẩu có nút Hiện/Ẩn; tùy chọn thanh độ mạnh 4 vạch */
export function PasswordField({
  value,
  onValue,
  placeholder,
  showLabel,
  hideLabel,
  strength,
}: PasswordProps) {
  const [show, setShow] = useState(false);
  return (
    <>
      <div className={styles.affix}>
        {strength ? <Icon name="lock" stroke="rgba(0,0,0,0.35)" /> : null}
        <input
          className={styles.bare}
          type={show ? 'text' : 'password'}
          autoComplete="new-password"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onValue(e.target.value)}
        />
        <button type="button" className={styles.reveal} onClick={() => setShow((v) => !v)}>
          {show ? hideLabel : showLabel}
        </button>
      </div>
      {strength ? (
        <>
          <div className={styles.strength} aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <i key={i} data-on={i < strength.level} />
            ))}
          </div>
          <span className={styles.hint}>{strength.hint}</span>
        </>
      ) : null}
    </>
  );
}

/** Ô đồng ý điều khoản */
export function AgreeCheck({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className={styles.agree}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {children}
    </label>
  );
}

export function SubmitButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" className={styles.submit} onClick={onClick}>
      {children}
    </button>
  );
}

/** Ô nhập + nút "Tra cứu" bên phải */
export function LookupButton({
  label,
  onLookup,
  children,
}: {
  label: string;
  onLookup: () => void;
  children: ReactNode;
}) {
  return (
    <div className={styles.row}>
      <div className={styles.grow}>{children}</div>
      <button
        type="button"
        className={styles.lookup}
        onClick={(e) => {
          e.preventDefault();
          onLookup();
        }}
      >
        {label}
      </button>
    </div>
  );
}

/** Lưới: ngành chính (full) + chip ngành phụ (có ×) + Quy mô */
export function IndustryChips({
  main,
  title,
  items,
  removeLabel,
  onRemove,
  size,
}: {
  main: ReactNode;
  title: string;
  items: string[];
  removeLabel: (name: string) => string;
  onRemove: (index: number) => void;
  size: ReactNode;
}) {
  return (
    <div className={styles.grid2}>
      {main}
      {items.length ? (
        <div className={`${styles.subs} ${styles.full}`}>
          <span className={styles.subsTitle}>{title}</span>
          <div className={styles.chips}>
            {items.map((x, i) => (
              <span key={x} className={styles.subChip}>
                {x}
                <button
                  type="button"
                  className={styles.subRemove}
                  aria-label={removeLabel(x)}
                  onClick={() => onRemove(i)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      ) : null}
      {size}
    </div>
  );
}
