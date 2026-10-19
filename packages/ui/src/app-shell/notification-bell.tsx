'use client';

import { useRef, useState } from 'react';
import { Icon } from '../icons';
import type { IconName } from '../icons';
import styles from './notification-bell.module.css';
import { usePopover } from './use-popover';

export type NotificationKind = 'mention' | 'event' | 'group' | 'verify' | 'membership' | 'invest';

export interface NotificationView {
  id: string;
  type: NotificationKind;
  title: string;
  body: string;
  /** Đã định dạng sẵn, VD "10 phút trước" */
  ago: string;
  read: boolean;
}

export interface NotificationBellLabels {
  button: string;
  title: string;
  markAll: string;
  tabAll: string;
  tabUnread: (n: number) => string;
  empty: string;
}

export interface NotificationBellProps {
  items: NotificationView[];
  unread: number;
  labels: NotificationBellLabels;
  onOpenItem: (id: string) => void;
  onMarkAll: () => void;
}

/** Icon + màu nền/chữ theo loại (prototype NT) */
const KIND: Record<NotificationKind, [IconName, string, string]> = {
  mention: ['ntMention', '#E6F4FF', '#1677FF'],
  event: ['events', '#FFF7E6', '#D46B08'],
  group: ['ntGroup', '#F6FFED', '#389E0D'],
  verify: ['ntVerify', '#F6FFED', '#389E0D'],
  membership: ['ntWarn', '#FFF2F0', '#CF1322'],
  // Prototype không có NT.invest → rơi về NT.mention
  invest: ['ntMention', '#E6F4FF', '#1677FF'],
};

/** P-07 → P-10: chuông + dropdown "Thông báo" (Tất cả / Chưa đọc (N), đánh dấu đã đọc) */
export function NotificationBell({
  items,
  unread,
  labels,
  onOpenItem,
  onMarkAll,
}: NotificationBellProps) {
  const root = useRef<HTMLDivElement>(null);
  const pop = usePopover(root);
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const list = tab === 'unread' ? items.filter((n) => !n.read) : items;
  const tabs = [
    ['all', labels.tabAll],
    ['unread', labels.tabUnread(unread)],
  ] as const;

  return (
    <div ref={root} className={styles.root}>
      <button
        type="button"
        className={styles.bell}
        title={labels.button}
        aria-label={labels.button}
        aria-haspopup="dialog"
        aria-expanded={pop.open}
        data-open={pop.open}
        onClick={pop.toggle}
      >
        <Icon name="bell" size={20} />
        {unread > 0 ? <span className={styles.unread}>{unread > 99 ? '99+' : unread}</span> : null}
      </button>
      {pop.open ? (
        <div className={styles.panel} role="dialog" aria-label={labels.title}>
          <div className={styles.head}>
            <span className={styles.title}>{labels.title}</span>
            <button type="button" className={styles.markAll} onClick={onMarkAll}>
              {labels.markAll}
            </button>
          </div>
          <div className={styles.tabs} role="tablist">
            {tabs.map(([k, label]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={tab === k}
                className={styles.tab}
                onClick={() => setTab(k)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className={styles.list}>
            {list.map((n) => (
              <NotificationRow
                key={n.id}
                n={n}
                onOpen={() => {
                  pop.close();
                  onOpenItem(n.id);
                }}
              />
            ))}
            {list.length === 0 ? <div className={styles.empty}>{labels.empty}</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function NotificationRow({ n, onOpen }: { n: NotificationView; onOpen: () => void }) {
  const [icon, bg, fg] = KIND[n.type];
  return (
    <button type="button" className={styles.item} data-read={n.read} onClick={onOpen}>
      <span className={styles.icon} style={{ background: bg, color: fg }}>
        <Icon name={icon} size={17} />
      </span>
      <span className={styles.text}>
        <span className={styles.itemTitle}>{n.title}</span>
        <span className={styles.body}>{n.body}</span>
        <span className={styles.ago}>{n.ago}</span>
      </span>
      {n.read ? null : <i className={styles.dot} aria-hidden="true" />}
    </button>
  );
}
