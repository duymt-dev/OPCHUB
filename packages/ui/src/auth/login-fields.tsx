'use client';

import { Button, Checkbox } from 'antd';
import { ArrowRightIcon, EyeOffIcon, FieldLockIcon, FieldMailIcon } from './auth-icons';
import { keepAnchor } from './keep-anchor';
import styles from './login-panel.module.css';
import type { LoginLabels } from './types';
import type { useLoginForm } from './use-login-form';

interface LoginFieldsProps {
  labels: LoginLabels;
  form: ReturnType<typeof useLoginForm>;
  notice?: string | undefined;
  onForgot?: (() => void) | undefined;
}

/** Ô email / SĐT + mật khẩu không nhãn, ghi nhớ, quên mật khẩu, nút "Đăng nhập →" (A-01 v4) */
export function LoginFields({ labels, form: f, notice, onForgot }: LoginFieldsProps) {
  const { identifier, password, remember, showPwd, error, pending } = f.state;
  return (
    <form className={styles.form} onSubmit={(e) => void f.submit(e)} noValidate>
      <label className={styles.box}>
        <FieldMailIcon />
        <input
          aria-label={labels.email}
          autoComplete="username"
          value={identifier}
          placeholder={labels.emailPlaceholder}
          onChange={(e) => f.setIdentifier(e.target.value)}
        />
      </label>
      <label className={styles.box}>
        <FieldLockIcon />
        <input
          aria-label={labels.password}
          type={showPwd ? 'text' : 'password'}
          autoComplete="current-password"
          value={password}
          placeholder={labels.passwordPlaceholder}
          onChange={(e) => f.setPassword(e.target.value)}
        />
        <button
          type="button"
          className={styles.reveal}
          title={showPwd ? labels.hide : labels.show}
          aria-label={showPwd ? labels.hide : labels.show}
          onClick={() => f.setShowPwd((v) => !v)}
        >
          <EyeOffIcon />
        </button>
      </label>
      <div className={styles.row}>
        <Checkbox
          checked={remember}
          onChange={(e) => f.setRemember(e.target.checked)}
          className={styles.remember ?? ''}
        >
          {labels.remember}
        </Checkbox>
        <button type="button" className={styles.link} onMouseDown={keepAnchor} onClick={onForgot}>
          {labels.forgot}
        </button>
      </div>
      <FormError text={error ?? notice} />
      <SubmitButton label={labels.submit} pending={pending} />
    </form>
  );
}

/**
 * P5-MSW-RESET-PENDING-01: AntD keeps its "loading" icon label during the leave motion, so the
 * action's accessible name is pinned instead of depending on that transient child.
 */
function SubmitButton({ label, pending }: { label: string; pending: boolean }) {
  return (
    <Button
      aria-label={label}
      type="primary"
      htmlType="submit"
      loading={pending}
      className={styles.submit ?? ''}
      icon={pending ? undefined : <ArrowRightIcon />}
      iconPlacement="end"
    >
      {label}
    </Button>
  );
}

function FormError({ text }: { text?: string | undefined }) {
  if (!text) return null;
  return (
    <div role="alert" className={styles.error}>
      {text}
    </div>
  );
}
