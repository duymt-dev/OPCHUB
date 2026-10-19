'use client';

import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import styles from './field-error.module.css';

export interface FieldErrorProps {
  /** id để ô trỏ `aria-describedby` */
  id: string;
  text?: string | undefined;
  /** Chỉ lỗi đầu tiên mang `role=alert` để trình đọc màn hình không đọc lặp */
  alert?: boolean | undefined;
}

/** Chữ lỗi đỏ dưới ô (BUG-022). Không có lỗi → không vẽ gì (giữ bố cục mặc định cho parity) */
export function FieldError({ id, text, alert }: FieldErrorProps) {
  if (!text) return null;
  return (
    <span id={id} className={styles.error} role={alert ? 'alert' : undefined}>
      {text}
    </span>
  );
}

/** Vẽ lỗi của một ô nếu có (tiện cho `err(k)` trả undefined) */
export function FieldErrorOf({ e }: { e: FieldErrorProps | undefined }) {
  return e ? <FieldError {...e} /> : null;
}

/** Thuộc tính a11y gắn lên ô nhập khi ô sai */
export interface InvalidProps {
  'aria-invalid'?: true;
  'aria-describedby'?: string;
}

export const invalidProps = (e: FieldErrorProps | undefined): InvalidProps =>
  e?.text ? { 'aria-invalid': true, 'aria-describedby': e.id } : {};

const FieldA11y = createContext<InvalidProps>({});

/** Bọc ô nhập con (TextInput, PhoneField, PasswordField…) để chúng tự gắn `aria-invalid` */
export function FieldA11yProvider({
  error,
  children,
}: {
  error: FieldErrorProps | undefined;
  children: ReactNode;
}) {
  return <FieldA11y.Provider value={invalidProps(error)}>{children}</FieldA11y.Provider>;
}

export const useFieldA11y = (): InvalidProps => useContext(FieldA11y);
