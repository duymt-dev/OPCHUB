'use client';

import { Icon } from '../icons';
import styles from './app-shell.module.css';
import { SidebarFooter } from './sidebar-footer';
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
> & { open: boolean; mini: boolean; onClose: () => void; onToggleMini: () => void };

/**
 * Sidebar 248px; thu gọn → 76px (chỉ icon, badge thành chấm đỏ).
 * ≤767px: drawer 272px, bấm mục hoặc nền thì đóng; nút thu gọn ẩn.
 */
export function Sidebar(props: SidebarProps) {
  const { nav, activeKey, user, labels, onNavigate, open, mini, onClose } = props;
  const tip = mini ? (labels.expand ?? labels.collapse) : labels.collapse;

  return (
    <aside className={styles.sidebar} data-open={open} data-mini={mini}>
      <div className={styles.brand}>
        {mini ? (
          <div className={styles.brandMini}>
            <img src={props.logoSrc} alt={props.logoAlt} />
          </div>
        ) : (
          <>
            <div className={styles.brandLogo}>
              <img src={props.logoSrc} alt={props.logoAlt} />
            </div>
            {props.brandTag ? <span className={styles.brandTag}>{props.brandTag}</span> : null}
          </>
        )}
        <button
          type="button"
          className={styles.collapse}
          title={tip}
          aria-label={tip}
          aria-expanded={!mini}
          onClick={props.onToggleMini}
        >
          <Icon
            name="chevronLeft"
            size={14}
            strokeWidth={2.2}
            className={styles.collapseIcon ?? ''}
          />
        </button>
      </div>

      <nav className={styles.nav} aria-label={labels.navTitle}>
        <div className={styles.navTitle}>{labels.navTitle}</div>
        {nav.map((item) => (
          <a
            key={item.key}
            href={item.href}
            title={item.label}
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
            {item.badge ? <i className={styles.dot} aria-hidden="true" /> : null}
          </a>
        ))}
      </nav>

      <SidebarFooter
        user={user}
        labels={labels}
        extra={props.sidebarExtra}
        onClose={onClose}
        {...(props.onProfile ? { onProfile: props.onProfile } : {})}
        {...(props.onLogout ? { onLogout: props.onLogout } : {})}
      />
    </aside>
  );
}
