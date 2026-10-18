'use client';

import { useState } from 'react';
import { Field, PasswordField } from './register/fields';
import styles from './reset-panel.module.css';

export interface ResetLabels {
  back: string;
  title: string;
  sub: string;
  newPassword: string;
  newPasswordPlaceholder: string;
  confirm: string;
  confirmPlaceholder: string;
  hint: string;
  show: string;
  hide: string;
  submit: string;
  resend: string;
}

export interface ResetFieldErrors {
  newPassword?: string | undefined;
  confirm?: string | undefined;
}

interface ResetPanelProps {
  labels: ResetLabels;
  /** Độ mạnh 0–4 (như form đăng ký) */
  strengthOf: (pwd: string) => number;
  /** Link thiếu / sai / hết hạn → khối báo lỗi + nút "Gửi lại liên kết", ẩn form */
  invalid?: string | undefined;
  fieldErrors?: ResetFieldErrors | undefined;
  busy?: boolean | undefined;
  onSubmit: (newPassword: string, confirm: string) => void;
  onResend: () => void;
  onBack: () => void;
}

/** QT-02: đặt lại mật khẩu từ link trong mail (khuôn màn Quên mật khẩu, V2Q-56) */
export function ResetPanel({
  labels,
  strengthOf,
  invalid,
  fieldErrors,
  busy,
  ...on
}: ResetPanelProps) {
  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  return (
    <>
      <button type="button" className={styles.back} onClick={on.onBack}>
        {labels.back}
      </button>
      <div className={styles.head}>
        <h1 className={styles.title}>{labels.title}</h1>
        {invalid ? null : <div className={styles.sub}>{labels.sub}</div>}
      </div>
      {invalid ? (
        <>
          <div role="alert" className={styles.error}>
            {invalid}
          </div>
          <button type="button" className={styles.submit} onClick={on.onResend}>
            {labels.resend}
          </button>
        </>
      ) : (
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            on.onSubmit(pwd, confirm);
          }}
        >
          <Field label={labels.newPassword} required>
            <PasswordField
              value={pwd}
              onValue={setPwd}
              placeholder={labels.newPasswordPlaceholder}
              showLabel={labels.show}
              hideLabel={labels.hide}
              strength={{ hint: labels.hint, level: strengthOf(pwd) }}
            />
            <FieldError text={fieldErrors?.newPassword} />
          </Field>
          <Field label={labels.confirm} required>
            <PasswordField
              value={confirm}
              onValue={setConfirm}
              placeholder={labels.confirmPlaceholder}
              showLabel={labels.show}
              hideLabel={labels.hide}
            />
            <FieldError text={fieldErrors?.confirm} />
          </Field>
          <button type="submit" className={styles.submit} disabled={busy}>
            {labels.submit}
          </button>
        </form>
      )}
    </>
  );
}

function FieldError({ text }: { text: string | undefined }) {
  return text ? (
    <span role="alert" className={styles.fieldError}>
      {text}
    </span>
  ) : null;
}
