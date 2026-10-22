'use client';

import { Button, Checkbox, Input } from 'antd';
import { Icon } from '../icons';
import { AuthHeader } from './auth-header';
import { LegalAndDemo, SsoSection } from './login-extras';
import styles from './login-panel.module.css';
import { useLoginForm } from './use-login-form';
import type { LoginPanelProps } from './types';

const ICON_STROKE = 'rgba(0,0,0,0.35)';

/** Form đăng nhập (A-01): tab, email/mật khẩu, ghi nhớ, SSO, tài khoản dùng thử */
export function LoginPanel({
  labels,
  sso,
  demoAccounts,
  notice,
  onSubmit,
  ...nav
}: LoginPanelProps) {
  const f = useLoginForm(onSubmit);
  const { identifier, password, remember, showPwd, error, pending } = f.state;
  const { setIdentifier, setPassword, setRemember, setShowPwd, setError, submit } = f;

  return (
    <div className={styles.panel}>
      <LoginHeader labels={labels} onRegister={nav.onRegister} />

      <form className={styles.form} onSubmit={(e) => void submit(e)} noValidate>
        <label className={styles.field}>
          {labels.email}
          <Input
            className={styles.input}
            type="email"
            autoComplete="username"
            value={identifier}
            placeholder={labels.emailPlaceholder}
            prefix={<Icon name="mail" stroke={ICON_STROKE} />}
            onChange={(e) => setIdentifier(e.target.value)}
          />
        </label>
        <label className={styles.field}>
          {labels.password}
          <Input
            className={styles.input}
            type={showPwd ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            placeholder={labels.passwordPlaceholder}
            prefix={<Icon name="lock" stroke={ICON_STROKE} />}
            suffix={
              <button type="button" className={styles.reveal} onClick={() => setShowPwd((v) => !v)}>
                {showPwd ? labels.hide : labels.show}
              </button>
            }
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <div className={styles.row}>
          <Checkbox
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className={styles.remember ?? ''}
          >
            {labels.remember}
          </Checkbox>
          <button type="button" className={styles.link} onClick={nav.onForgot}>
            {labels.forgot}
          </button>
        </div>
        <FormError text={error ?? notice} />
        <SubmitButton label={labels.submit} pending={pending} />
      </form>

      {sso.length ? <SsoSection label={labels.orContinue} sso={sso} onSso={nav.onSso} /> : null}
      <LegalAndDemo
        labels={labels}
        accounts={demoAccounts}
        onPick={(a) => {
          setIdentifier(a.email);
          setPassword(a.password);
          setError(undefined);
        }}
      />
    </div>
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
      size="large"
      loading={pending}
      className={styles.submit ?? ''}
    >
      {label}
    </Button>
  );
}

function LoginHeader({
  labels,
  onRegister,
}: {
  labels: LoginPanelProps['labels'];
  onRegister?: (() => void) | undefined;
}) {
  return (
    <AuthHeader
      title={labels.title}
      sub={labels.sub}
      tabs={{
        active: 'login',
        loginLabel: labels.tabLogin,
        registerLabel: labels.tabRegister,
        onRegister,
      }}
    />
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
