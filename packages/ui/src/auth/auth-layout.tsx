import type { ReactNode } from 'react';
import { Icon } from '../icons';
import styles from './auth-layout.module.css';

export interface AuthLayoutProps {
  hero: ReactNode;
  supportText: string;
  supportLink: string;
  supportHref: string;
  languageLabel: string;
  children: ReactNode;
}

/** Bố cục 2 cột màn Auth: cột trái (hero) + cột phải (hỗ trợ, ngôn ngữ, form) */
export function AuthLayout({
  hero,
  supportText,
  supportLink,
  supportHref,
  languageLabel,
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
          <button type="button" className={styles.lang}>
            <Icon name="globe" size={18} />
            {languageLabel}
            <Icon name="chevronDown" size={14} stroke="rgba(0,0,0,0.45)" />
          </button>
        </div>
        <div className={styles.center}>{children}</div>
      </div>
    </div>
  );
}
