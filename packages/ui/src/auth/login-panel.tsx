'use client';

import { Button, Checkbox, Input } from 'antd';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Icon, SsoIcon } from '../icons';
import styles from './login-panel.module.css';
import type { LoginPanelProps } from './types';

const ICON_STROKE = 'rgba(0,0,0,0.35)';

/** Form đăng nhập (A-01): tab, email/mật khẩu, ghi nhớ, SSO, tài khoản dùng thử */
export function LoginPanel({ labels, sso, demoAccounts, onSubmit, ...nav }: LoginPanelProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    setPending(true);
    try {
      setError(await onSubmit({ identifier, password, remember }));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className={styles.panel}>
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
          onClick={nav.onRegister}
        >
          {labels.tabRegister}
        </button>
      </div>

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

      <div className={styles.divider}>
        <i />
        {labels.orContinue}
        <i />
      </div>
      <div className={styles.sso}>
        {sso.map((s) => (
          <button
            key={s.id}
            type="button"
            className={styles.ssoBtn}
            onClick={() => nav.onSso?.(s.id)}
          >
            <SsoIcon id={s.id} />
            <span>{s.name}</span>
          </button>
        ))}
      </div>

      <div className={styles.legal}>
        <span>{labels.terms}</span>
        <span>{labels.privacy}</span>
      </div>
      <div className={styles.demo}>
        <span className={styles.demoTitle}>{labels.demoTitle}</span>
        {demoAccounts.map((a) => (
          <button
            key={a.email}
            type="button"
            className={styles.demoItem}
            onClick={() => {
              setIdentifier(a.email);
              setPassword(a.password);
              setError(undefined);
            }}
          >
            <span className={styles.demoLabel}>{a.label}</span>
            <span className={styles.demoTag} data-tone={a.tone}>
              {a.tag}
            </span>
            <span className={styles.demoCred}>
              {a.email} · {a.password}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
