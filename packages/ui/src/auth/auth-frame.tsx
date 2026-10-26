'use client';

import type { ReactNode } from 'react';
import { AuthFooter, AuthHero } from './auth-hero';
import { AuthLayout } from './auth-layout';
import { LanguageSwitch } from './language-switch';
import type { LanguageOption } from './language-menu';
import styles from './login-panel.module.css';
import type { AuthFooterProps, AuthHeroCopy } from './types';

/** Ảnh nền màn Auth v4 — mỗi app chép `docs/spec/assets/login-bg-v11.png` vào `public/auth/` */
export const AUTH_BACKGROUND = '/auth/login-bg-v11.png';

export interface AuthFrameCopy {
  hero: AuthHeroCopy;
  footer: Omit<AuthFooterProps, 'flags'>;
  support: string;
  contact: string;
  langTitle: string;
}

export interface AuthFrameProps {
  copy: AuthFrameCopy;
  locale: string;
  languages: LanguageOption[];
  cookieName: string;
  flags: AuthFooterProps['flags'];
  children: ReactNode;
}

/** Khung chung màn Auth v4 (Portal + Admin): nền ảnh, hero, thẻ form, chân trang */
export function AuthFrame({
  copy,
  locale,
  languages,
  cookieName,
  flags,
  children,
}: AuthFrameProps) {
  return (
    <AuthLayout
      background={AUTH_BACKGROUND}
      hero={<AuthHero copy={copy.hero} />}
      supportText={copy.support}
      supportLink={copy.contact}
      supportHref="#"
      language={
        <LanguageSwitch
          title={copy.langTitle}
          current={locale}
          options={languages}
          cookieName={cookieName}
        />
      }
      footer={<AuthFooter flags={flags} {...copy.footer} />}
    >
      {children}
    </AuthLayout>
  );
}

/** Nhóm khối form trong thẻ (gap 18px như prototype) */
export function AuthPanel({ children }: { children: ReactNode }) {
  return <div className={styles.panel}>{children}</div>;
}
