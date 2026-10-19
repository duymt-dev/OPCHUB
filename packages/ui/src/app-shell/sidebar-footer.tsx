'use client';

import type { ReactNode } from 'react';
import styles from './app-shell.module.css';

/**
 * Chân sidebar ver2: chỉ còn khối phụ ("Sự kiện sắp tới"); hồ sơ + đăng xuất chuyển vào menu
 * người dùng ở topbar (prototype v4). Thu gọn → ẩn khối phụ.
 */
export function SidebarFooter({ extra }: { extra?: ReactNode }) {
  if (!extra) return null;
  return (
    <div className={styles.sidebarFooter}>
      <div className={styles.extra}>{extra}</div>
    </div>
  );
}
