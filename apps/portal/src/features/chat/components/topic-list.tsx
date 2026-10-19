'use client';

import { groupCoverSrc } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { fmtNumber, lastWord } from '../format';
import type { ChatGroup, ChatRoom } from '../types';
import { TopicForm } from './topic-form';
import styles from './topic-list.module.css';

interface Props {
  group: ChatGroup;
  rooms: ChatRoom[];
  activeId: string | null;
  onOpen: (r: ChatRoom) => void;
  onCreate: (name: string, description: string) => Promise<ChatRoom | null>;
  onDelete: (r: ChatRoom) => void;
}

function TopicItem({
  r,
  active,
  onOpen,
  onDelete,
}: {
  r: ChatRoom;
  active: boolean;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations('chat.list');
  const last = r.lastMessage
    ? t('last', { who: lastWord(r.lastMessage.senderName), text: r.lastMessage.text })
    : t('noMessage');
  const unread = !active && r.unread > 0;
  return (
    <div
      role="button"
      tabIndex={0}
      aria-current={active}
      className={`${styles.item} ${unread ? styles.unreadItem : ''}`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen();
      }}
    >
      <span className={styles.hash}>#</span>
      <span className={styles.text}>
        <span className={styles.name}>{r.name}</span>
        <span className={styles.last}>{last}</span>
      </span>
      {r.mine ? (
        <span
          role="button"
          tabIndex={0}
          title={t('deleteTopic')}
          aria-label={t('deleteTopic')}
          className={styles.del}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onDelete();
          }}
        >
          ✕
        </span>
      ) : null}
      {unread ? <span className={styles.unread}>{r.unread}</span> : null}
    </div>
  );
}

/** Cột giữa: ảnh bìa + thông tin nhóm + danh sách CHỦ ĐỀ THẢO LUẬN (ẩn dưới 768px) */
export function TopicList({ group, rooms, activeId, onOpen, onCreate, onDelete }: Props) {
  const t = useTranslations('chat.list');
  const [creating, setCreating] = useState(false);
  return (
    <div className={styles.list} data-m="chlist">
      <div className={styles.cover}>
        {/* eslint-disable-next-line @next/next/no-img-element -- ảnh bìa storage động (BUG-011) */}
        <img src={groupCoverSrc(group.coverUrl)} alt="" />
      </div>
      <div className={styles.head}>
        <div className={styles.avatarRow}>
          <div className={styles.avatar}>
            {/* eslint-disable-next-line @next/next/no-img-element -- ảnh bìa storage động (BUG-011) */}
            <img src={groupCoverSrc(group.thumbUrl)} alt="" />
          </div>
          <span className={styles.region}>
            {group.province} · {group.region}
          </span>
        </div>
        <div className={styles.groupName}>{group.name}</div>
        <div className={styles.meta}>
          {t('members', { members: fmtNumber(group.memberCount) })}
          <span className={styles.online}>{t('online', { n: group.online })}</span>
        </div>
      </div>
      <div className={styles.scroll}>
        <div className={styles.title}>
          <span>{t('topics')}</span>
          <button
            type="button"
            title={t('newTopic')}
            aria-label={t('newTopic')}
            className={styles.add}
            onClick={() => setCreating((v) => !v)}
          >
            +
          </button>
        </div>
        {creating ? (
          <TopicForm
            onCreate={(n, d) =>
              onCreate(n, d).then((r) => {
                if (r) {
                  setCreating(false);
                  onOpen(r);
                }
                return r;
              })
            }
          />
        ) : null}
        {rooms.map((r) => (
          <TopicItem
            key={r.id}
            r={r}
            active={r.id === activeId}
            onOpen={() => onOpen(r)}
            onDelete={() => onDelete(r)}
          />
        ))}
      </div>
    </div>
  );
}

/** Cột giữa khi chưa tham gia nhóm nào */
export function NoGroupsList() {
  const t = useTranslations('chat.list');
  return (
    <div className={styles.list} data-m="chlist">
      <div className={styles.empty}>{t('noGroups')}</div>
    </div>
  );
}
