'use client';

import { useState } from 'react';
import styles from './app-shell.module.css';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import type { AppShellProps } from './types';

/**
 * Khung ứng dụng dùng chung Portal + Admin: sidebar 248px, topbar 64px, vùng nội dung.
 * ≤767px sidebar thành drawer, mở bằng nút burger.
 */
export function AppShell(props: AppShellProps) {
  const [navOpen, setNavOpen] = useState(false);
  const close = () => setNavOpen(false);

  return (
    <div className={styles.root}>
      <Sidebar {...props} open={navOpen} onClose={close} />
      <div className={styles.overlay} data-open={navOpen} onClick={close} aria-hidden="true" />
      <div className={styles.main}>
        <Topbar
          pageTitle={props.pageTitle}
          user={props.user}
          labels={props.labels}
          unreadCount={props.unreadCount ?? 0}
          {...(props.onBack ? { onBack: props.onBack } : {})}
          onMenu={() => setNavOpen((v) => !v)}
        />
        <main className={styles.content}>{props.children}</main>
      </div>
    </div>
  );
}
