import type { ReactNode } from 'react';
import { HeadsetIcon } from './auth-icons';
import styles from './auth-layout.module.css';

export interface AuthLayoutProps {
  /** Ảnh nền toàn trang (prototype `assets/login-bg-v11.png`) */
  background: string;
  hero: ReactNode;
  supportText: string;
  supportLink: string;
  supportHref: string;
  /** Nút + bảng chọn ngôn ngữ (LanguageMenu) */
  language: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}

/** Màn Auth v4: ảnh nền phủ trang, hỗ trợ + ngôn ngữ trên cùng, hero trái, thẻ form phải, chân trang */
export function AuthLayout({
  background,
  hero,
  supportText,
  supportLink,
  supportHref,
  language,
  footer,
  children,
}: AuthLayoutProps) {
  return (
    <div className={styles.root} style={{ backgroundImage: `url(${background})` }}>
      <div className={styles.topbar}>
        <span className={styles.support}>
          <HeadsetIcon />
          <span>
            {supportText} <a href={supportHref}>{supportLink}</a>
          </span>
        </span>
        <span className={styles.sep} />
        {language}
      </div>
      <div className={styles.main}>
        {hero}
        <div className={styles.right}>
          <div className={styles.card}>{children}</div>
        </div>
      </div>
      {footer}
    </div>
  );
}
