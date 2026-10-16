import type { ReactNode } from 'react';
import styles from './page-header.module.css';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  extra?: ReactNode;
}

/** Tiêu đề trang 26px + mô tả + vùng hành động bên phải */
export function PageHeader({ title, subtitle, extra }: PageHeaderProps) {
  return (
    <div className={styles.header}>
      <div className={styles.text}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle ? <div className={styles.sub}>{subtitle}</div> : null}
      </div>
      {extra}
    </div>
  );
}
