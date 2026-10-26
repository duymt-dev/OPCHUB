'use client';

import { useState } from 'react';
import styles from './app-shell.module.css';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import type { AppShellProps } from './types';
import { useSidebarMini } from './use-sidebar-mini';

/**
 * Khung ứng dụng dùng chung Portal + Admin: sidebar 248px (thu gọn 76px, nhớ trong
 * localStorage), topbar 64px, vùng nội dung. ≤767px sidebar thành drawer mở bằng burger.
 */
export function AppShell(props: AppShellProps) {
  const [navOpen, setNavOpen] = useState(false);
  const { mini, toggle } = useSidebarMini();
  const close = () => setNavOpen(false);

  return (
    <div className={styles.root}>
      <Sidebar {...props} open={navOpen} mini={mini} onClose={close} onToggleMini={toggle} />
      <div className={styles.overlay} data-open={navOpen} onClick={close} aria-hidden="true" />
      <div className={styles.main}>
        <Topbar
          pageTitle={props.pageTitle}
          user={props.user}
          labels={props.labels}
          unreadCount={props.unreadCount ?? 0}
          {...(props.notifications ? { notifications: props.notifications } : {})}
          {...(props.language ? { language: props.language } : {})}
          {...(props.onBack ? { onBack: props.onBack } : {})}
          {...(props.onProfile ? { onProfile: props.onProfile } : {})}
          {...(props.onSettings ? { onSettings: props.onSettings } : {})}
          {...(props.onLogout ? { onLogout: props.onLogout } : {})}
          onMenu={() => setNavOpen((v) => !v)}
        />
        <main className={styles.content}>{props.children}</main>
      </div>
    </div>
  );
}
