import type { ReactNode } from 'react';
import styles from './login-panel.module.css';

export interface AuthTabs {
  active: 'login' | 'register';
  loginLabel: string;
  registerLabel: string;
  onLogin?: (() => void) | undefined;
  onRegister?: (() => void) | undefined;
}

/** Khung cột phải màn Auth: rộng tối đa 440px, các khối cách nhau 20px */
export function AuthPanel({ children }: { children: ReactNode }) {
  return <div className={styles.panel}>{children}</div>;
}

/** Tiêu đề + phụ đề + tab Đăng nhập/Đăng ký (ẩn tab ở màn quên mật khẩu) */
export function AuthHeader({ title, sub, tabs }: { title: string; sub: string; tabs?: AuthTabs }) {
  return (
    <>
      <div className={styles.head}>
        <h1 className={styles.title}>{title}</h1>
        <div className={styles.sub}>{sub}</div>
      </div>
      {tabs ? (
        <div className={styles.tabs} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tabs.active === 'login'}
            className={styles.tab}
            onClick={tabs.onLogin}
          >
            {tabs.loginLabel}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tabs.active === 'register'}
            className={styles.tab}
            onClick={tabs.onRegister}
          >
            {tabs.registerLabel}
          </button>
        </div>
      ) : null}
    </>
  );
}
