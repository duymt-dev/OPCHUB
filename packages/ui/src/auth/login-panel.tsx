'use client';

import { AuthHeader } from './auth-header';
import { DemoAccounts, RegisterPrompt, SsoSection } from './login-extras';
import { LoginFields } from './login-fields';
import { useLoginForm } from './use-login-form';
import type { LoginPanelProps } from './types';

/** Form đăng nhập v4 (A-01): ô email / SĐT + mật khẩu không nhãn, nút có mũi tên, SSO, link đăng ký */
export function LoginPanel({
  labels,
  sso,
  ssoPending = false,
  demoAccounts,
  notice,
  onSubmit,
  ...nav
}: LoginPanelProps) {
  const f = useLoginForm(onSubmit);
  return (
    <>
      <AuthHeader
        title={labels.title}
        sub={labels.sub}
        tabs={{
          active: 'login',
          loginLabel: labels.tabLogin,
          registerLabel: labels.tabRegister,
          onRegister: nav.onRegister,
        }}
      />
      <LoginFields labels={labels} form={f} notice={notice} onForgot={nav.onForgot} />
      {sso.length || ssoPending ? (
        <SsoSection label={labels.orContinue} sso={sso} pending={ssoPending} onSso={nav.onSso} />
      ) : null}
      <RegisterPrompt
        text={labels.noAccount}
        link={labels.registerLink}
        onRegister={nav.onRegister}
      />
      <DemoAccounts
        title={labels.demoTitle}
        accounts={demoAccounts}
        onPick={(a) => {
          f.setIdentifier(a.email);
          f.setPassword(a.password);
          f.setError(undefined);
        }}
      />
    </>
  );
}
