import type { ReactNode } from 'react';
import styles from './auth-layout.module.css';

export interface AuthLayoutProps {
  hero: ReactNode;
  supportText: string;
  supportLink: string;
  supportHref: string;
  /** Nút + bảng chọn ngôn ngữ (LanguageMenu) */
  language: ReactNode;
  children: ReactNode;
}

/** Bố cục 2 cột màn Auth: cột trái (hero) + cột phải (hỗ trợ, ngôn ngữ, form) */
export function AuthLayout({
  hero,
  supportText,
  supportLink,
  supportHref,
  language,
  children,
}: AuthLayoutProps) {
  return (
    <div className={styles.root}>
      {hero}
      <div className={styles.right}>
        <div className={styles.topbar}>
          <span className={styles.support}>
            {supportText} <a href={supportHref}>{supportLink}</a>
          </span>
          {language}
        </div>
        <div className={styles.center}>{children}</div>
      </div>
    </div>
  );
}
