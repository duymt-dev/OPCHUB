'use client';

import type { ReactNode } from 'react';
import { Icon } from '../icons';
import { UserAvatar } from '../user-avatar';
import styles from './app-shell.module.css';
import side from './sidebar.module.css';
import type { ShellLabels, ShellUser } from './types';

interface Props {
  user: ShellUser;
  labels: ShellLabels;
  extra?: ReactNode;
  onClose: () => void;
  onProfile?: () => void;
  onLogout?: () => void;
}

/** Chân sidebar: thẻ phụ (Sự kiện gần nhất) + khối hồ sơ; thu gọn → avatar + nút đăng xuất riêng */
export function SidebarFooter({ user, labels, extra, onClose, onProfile, onLogout }: Props) {
  return (
    <div className={styles.sidebarFooter}>
      <div className={styles.extra}>{extra}</div>
      <div className={side.profile}>
        <button
          type="button"
          className={side.profileMain}
          title={labels.profile}
          onClick={() => {
            onClose();
            onProfile?.();
          }}
        >
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
          onClick={onLogout}
        >
          <Icon name="logout" size={16} />
        </button>
      </div>
      <button
        type="button"
        className={side.logoutMini}
        title={labels.logout}
        aria-label={labels.logout}
        onClick={onLogout}
      >
        <Icon name="logout" size={16} />
      </button>
    </div>
  );
}
