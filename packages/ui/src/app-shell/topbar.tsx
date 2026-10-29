'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { Icon } from '../icons';
import { MeAvatar } from '../user-avatar';
import styles from './topbar.module.css';
import type { AppShellProps } from './types';
import { UserMenu } from './user-menu';

type TopbarProps = Pick<
  AppShellProps,
  | 'pageTitle'
  | 'user'
  | 'labels'
  | 'unreadCount'
  | 'onBack'
  | 'onProfile'
  | 'onSettings'
  | 'onLogout'
  | 'notifications'
  | 'language'
  | 'searchQuery'
  | 'onSearch'
  | 'search'
> & {
  onMenu: () => void;
};

interface TopbarSearchProps {
  label: string;
  searchQuery?: string;
  onSearch?: (query: string) => void;
}

function TopbarSearch({ label, searchQuery, onSearch }: TopbarSearchProps) {
  const [internalQuery, setInternalQuery] = useState(searchQuery ?? '');
  const [prevProp, setPrevProp] = useState(searchQuery);

  if (searchQuery !== prevProp) {
    setPrevProp(searchQuery);
    setInternalQuery(searchQuery ?? '');
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSearch?.(internalQuery.trim());
  };

  return (
    <form className={styles.searchWrap} onSubmit={handleSubmit} role="search">
      <div className={styles.search}>
        <Icon name="search" size={16} />
        <input
          type="search"
          className={styles.searchInput}
          value={internalQuery}
          onChange={(e) => setInternalQuery(e.target.value)}
          placeholder={label}
          aria-label={label}
        />
        {internalQuery ? (
          <button
            type="button"
            className={styles.searchClear}
            title="Xoá tìm kiếm"
            aria-label="Xoá tìm kiếm"
            onClick={() => {
              setInternalQuery('');
              onSearch?.('');
            }}
          >
            <Icon name="close" size={14} />
          </button>
        ) : null}
      </div>
    </form>
  );
}

function UserTrigger({ user }: { user: AppShellProps['user'] }) {
  return (
    <>
      <MeAvatar
        name={user.name}
        size={38}
        src={user.avatarUrl}
        color={user.avatarColor}
        text={user.avatarText}
      />
      <span className={styles.meText}>
        <span className={styles.meName}>{user.name}</span>
        <span className={styles.meSub}>{user.subtitle}</span>
      </span>
      <Icon name="chevronDown" size={14} stroke="rgba(0,0,0,0.45)" />
    </>
  );
}

/** Topbar 64px (56px ở mobile): burger · breadcrumb · tìm kiếm · chuông · ngôn ngữ · người dùng */
export function Topbar(props: TopbarProps) {
  const { pageTitle, user, labels, unreadCount = 0, onBack, onMenu, onSearch, searchQuery } = props;

  return (
    <header className={styles.top}>
      <button
        type="button"
        className={styles.burger}
        title={labels.menu}
        aria-label={labels.menu}
        onClick={onMenu}
      >
        <Icon name="menu" size={20} />
      </button>
      <div className={styles.crumb}>
        <button
          type="button"
          className={styles.home}
          title={labels.back}
          aria-label={labels.back}
          onClick={onBack}
        >
          <Icon name="back" size={16} />
        </button>
        <span className={styles.sep}>›</span>
        <span className={styles.title}>{pageTitle}</span>
      </div>
      {props.search ?? (
        <TopbarSearch
          label={labels.search}
          {...(searchQuery !== undefined ? { searchQuery } : {})}
          {...(onSearch ? { onSearch } : {})}
        />
      )}
      {props.notifications ?? (
        <button
          type="button"
          className={styles.bell}
          title={labels.notifications}
          aria-label={labels.notifications}
        >
          <Icon name="bell" size={20} />
          {unreadCount > 0 ? <span className={styles.unread}>{unreadCount}</span> : null}
        </button>
      )}
      {props.language ?? (
        <button type="button" className={styles.lang}>
          <Icon name="globe" size={18} />
          {labels.language}
          <Icon name="chevronDown" size={14} stroke="rgba(0,0,0,0.45)" />
        </button>
      )}
      <UserMenu
        user={user}
        labels={labels}
        {...(props.onProfile ? { onProfile: props.onProfile } : {})}
        {...(props.onSettings ? { onSettings: props.onSettings } : {})}
        {...(props.onLogout ? { onLogout: props.onLogout } : {})}
        trigger={<UserTrigger user={user} />}
      />
    </header>
  );
}
