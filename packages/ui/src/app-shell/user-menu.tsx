'use client';

import { useRef } from 'react';
import type { ReactNode } from 'react';
import { Icon } from '../icons';
import { UserAvatar } from '../user-avatar';
import styles from './user-menu.module.css';
import type { ShellLabels, ShellUser } from './types';
import { usePopover } from './use-popover';

interface UserMenuProps {
  user: ShellUser;
  labels: ShellLabels;
  trigger: ReactNode;
  onProfile?: () => void;
  onLogout?: () => void;
}

/** P-12: menu người dùng (tên, vai trò, "Hồ sơ cá nhân", "Đăng xuất") */
export function UserMenu({ user, labels, trigger, onProfile, onLogout }: UserMenuProps) {
  const root = useRef<HTMLDivElement>(null);
  const pop = usePopover(root);
  const run = (fn?: () => void) => () => {
    pop.close();
    fn?.();
  };

  return (
    <div ref={root} className={styles.root}>
      <button
        type="button"
        data-m="me"
        className={styles.me}
        aria-haspopup="menu"
        aria-expanded={pop.open}
        onClick={pop.toggle}
      >
        {trigger}
      </button>
      {pop.open ? (
        <div className={styles.menu} role="menu">
          <div className={styles.head}>
            <UserAvatar
              name={user.name}
              size={38}
              src={user.avatarUrl}
              color={user.avatarColor}
              text={user.avatarText}
            />
            <div className={styles.headText}>
              <span className={styles.name}>{user.name}</span>
              <span className={styles.sub}>{user.subtitle}</span>
            </div>
          </div>
          <button type="button" role="menuitem" className={styles.item} onClick={run(onProfile)}>
            <Icon name="person" size={16} />
            {labels.profile}
          </button>
          <div className={styles.sep} />
          <button
            type="button"
            role="menuitem"
            className={`${styles.item} ${styles.danger}`}
            onClick={run(onLogout)}
          >
            <Icon name="signOut" size={16} />
            {labels.logout}
          </button>
        </div>
      ) : null}
    </div>
  );
}
