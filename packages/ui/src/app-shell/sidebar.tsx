'use client';

import { Icon } from '../icons';
import { UserAvatar } from '../user-avatar';
import styles from './app-shell.module.css';
import side from './sidebar.module.css';
import type { AppShellProps } from './types';

type SidebarProps = Pick<
  AppShellProps,
  | 'logoSrc'
  | 'logoAlt'
  | 'brandTag'
  | 'nav'
  | 'activeKey'
  | 'user'
  | 'labels'
  | 'sidebarExtra'
  | 'onNavigate'
  | 'onLogout'
  | 'onProfile'
> & { open: boolean; onClose: () => void };

export function Sidebar(props: SidebarProps) {
  const { nav, activeKey, user, labels, onNavigate, open, onClose } = props;

  return (
    <aside className={styles.sidebar} data-open={open}>
      <div className={styles.brand}>
        <div className={styles.brandLogo}>
          <img src={props.logoSrc} alt={props.logoAlt} />
        </div>
        {props.brandTag ? <span className={styles.brandTag}>{props.brandTag}</span> : null}
        <button
          type="button"
          className={styles.collapse}
          title={labels.collapse}
          aria-label={labels.collapse}
        >
          <Icon name="chevronLeft" size={14} strokeWidth={2.2} />
        </button>
      </div>

      <nav className={styles.nav} aria-label={labels.navTitle}>
        <div className={styles.navTitle}>{labels.navTitle}</div>
        {nav.map((item) => (
          <a
            key={item.key}
            href={item.href}
            className={styles.navItem}
            aria-current={item.key === activeKey ? 'page' : undefined}
            onClick={(e) => {
              if (!onNavigate) return;
              e.preventDefault();
              onClose();
              onNavigate(item.href);
            }}
          >
            <Icon name={item.icon} size={19} strokeWidth={1.6} />
            <span className={styles.navLabel}>{item.label}</span>
            {item.badge ? <span className={styles.badge}>{item.badge}</span> : null}
          </a>
        ))}
      </nav>

      <div className={styles.sidebarFooter}>
        {props.sidebarExtra}
        <div className={side.profile}>
          <button type="button" className={side.profileMain} onClick={props.onProfile}>
            <UserAvatar
              name={user.name}
              size={36}
              src={user.avatarUrl}
              color={user.avatarColor}
              text={user.avatarText}
            />
            <span className={side.profileText}>
              <span className={side.profileName}>{user.name}</span>
              <span className={side.profileLink}>{labels.profile} →</span>
            </span>
          </button>
          <button
            type="button"
            className={side.logout}
            title={labels.logout}
            aria-label={labels.logout}
            onClick={props.onLogout}
          >
            <Icon name="logout" size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
