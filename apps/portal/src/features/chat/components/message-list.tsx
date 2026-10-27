'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { useStickToBottom } from '../hooks/use-stick-to-bottom';
import type { ChatRoom, MessageView } from '../types';
import { useRoomDesc } from './room-header';
import styles from './message-list.module.css';
import { MessageRow, type MessageRowActions } from './message-row';

interface Props {
  room: ChatRoom;
  groupName: string;
  views: MessageView[];
  selectedId: string | null;
  canPin: boolean;
  me: string;
  meAvatar: string | null;
  q: string;
  /** true khi người dùng vừa chuyển phòng/nhóm (không phải lần mở trang đầu) */
  scrollOnOpen: boolean;
  actions: MessageRowActions;
}

/** Vùng tin: lời chào phòng, mốc "Hôm nay", tin cũ → mới; tự cuộn xuống khi có tin mới */
export function MessageList(p: Props) {
  const t = useTranslations('chat.messages');
  const desc = useRoomDesc(p.room);
  const ref = useRef<HTMLDivElement>(null);
  const lastId = p.views.at(-1)?.msg.id;
  const seen = useRef<string | undefined>(undefined);
  const toBottom = useStickToBottom(ref);

  // Như prototype: vào chat lần đầu thì đứng ở đầu (thấy lời chào); đổi phòng hoặc có tin mới
  // thì cuộn xuống cuối. Phòng tải lại (reset query → rỗng một nhịp, cùng tin cuối) không cuộn.
  useEffect(() => {
    const first = seen.current === undefined;
    const fresh = !!lastId && lastId !== seen.current;
    if (lastId) seen.current = lastId;
    if (fresh && (!first || p.scrollOnOpen)) toBottom();
  }, [lastId, p.scrollOnOpen, toBottom]);

  return (
    <div className={styles.scroll} ref={ref} role="listbox" aria-label={p.room.name}>
      <div className={styles.welcome}>
        <span className={styles.bigHash}>#</span>
        <span className={styles.welcomeTitle}>{t('welcome', { name: p.room.name })}</span>
        <span className={styles.welcomeSub}>{t('welcomeSub', { desc, group: p.groupName })}</span>
      </div>
      <div className={styles.day}>
        <i />
        <span>{t('today')}</span>
        <i />
      </div>
      {p.views.map((v) => (
        <MessageRow
          key={v.msg.id}
          view={v}
          selected={p.selectedId === v.msg.id}
          canPin={p.canPin}
          me={p.me}
          meAvatar={p.meAvatar}
          q={p.q}
          actions={p.actions}
        />
      ))}
      {p.views.length === 0 ? <div className={styles.empty}>{t('empty')}</div> : null}
    </div>
  );
}
