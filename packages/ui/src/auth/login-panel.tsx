'use client';

import { Button, Checkbox, Input } from 'antd';
import { Icon } from '../icons';
import { LegalAndDemo, SsoSection } from './login-extras';
import styles from './login-panel.module.css';
import { useLoginForm } from './use-login-form';
import type { LoginPanelProps } from './types';

const ICON_STROKE = 'rgba(0,0,0,0.35)';

/** Form đăng nhập (A-01): tab, email/mật khẩu, ghi nhớ, SSO, tài khoản dùng thử */
export function LoginPanel({ labels, sso, demoAccounts, onSubmit, ...nav }: LoginPanelProps) {
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
        {error ? (
          <div role="alert" className={styles.error}>
            {error}
          </div>
        ) : null}
        <Button
          type="primary"
          htmlType="submit"
          size="large"
          loading={pending}
          className={styles.submit ?? ''}
        >
          {labels.submit}
        </Button>
      </form>

      <SsoSection label={labels.orContinue} sso={sso} onSso={nav.onSso} />
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

function LoginHeader({
  labels,
  onRegister,
}: {
  labels: LoginPanelProps['labels'];
  onRegister?: (() => void) | undefined;
}) {
  return (
    <>
      <div className={styles.head}>
        <h1 className={styles.title}>{labels.title}</h1>
        <div className={styles.sub}>{labels.sub}</div>
      </div>
      <div className={styles.tabs} role="tablist">
        <button type="button" role="tab" aria-selected="true" className={styles.tab}>
          {labels.tabLogin}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected="false"
          className={styles.tab}
          onClick={onRegister}
        >
          {labels.tabRegister}
        </button>
      </div>
    </>
  );
}
