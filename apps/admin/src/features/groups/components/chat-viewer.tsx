'use client';

import { ErrorState, PageHeader, PageSkeleton } from '@opchub/ui';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState } from 'react';
import { fetchMessages, fetchRooms, groupKeys } from '../api';
import { useGroupDetail } from '../hooks/use-groups';
import styles from './chat-viewer.module.css';

const time = (iso: string) =>
  new Date(iso).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });

function Messages({ roomId }: { roomId: string }) {
  const t = useTranslations('groups.chat');
  const q = useQuery({
    queryKey: groupKeys.messages(roomId),
    queryFn: () => fetchMessages(roomId),
  });
  if (q.isError)
    return (
      <ErrorState title={t('loadError')} retryLabel={t('retry')} onRetry={() => void q.refetch()} />
    );
  if (!q.data) return <PageSkeleton />;
  // API trả mới → cũ; hiển thị cũ → mới như phòng chat
  const list = [...q.data.items].reverse();
  if (!list.length) return <div className={styles.empty}>{t('empty')}</div>;
  return (
    <ol className={styles.msgs}>
      {list.map((m) => (
        <li key={m.id} className={styles.msg}>
          <div className={styles.msgHead}>
            <b>{m.sender.name}</b>
            <span className={styles.time}>{time(m.createdAt)}</span>
          </div>
          {m.body ? <div className={styles.body}>{m.body}</div> : null}
          {m.attachment ? (
            <div className={styles.file}>
              📎 {m.attachment.name} · {m.attachment.size}
            </div>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

/**
 * D-32 / D-26: "Xem chat" từ admin — trình xem lịch sử phòng chat CHỈ ĐỌC trong app admin
 * (prototype không đổi màn; xem DV-G4c-1). Không có ô soạn tin, không gửi được.
 */
export function ChatViewer({ groupId }: { groupId: string }) {
  const t = useTranslations('groups.chat');
  const group = useGroupDetail(groupId);
  const rooms = useQuery({
    queryKey: groupKeys.rooms(groupId),
    queryFn: () => fetchRooms(groupId),
  });
  const [roomId, setRoomId] = useState<string | null>(null);

  if (group.isError) return <ErrorState title={t('notFound')} />;
  if (!group.data || !rooms.data) return <PageSkeleton />;
  const active = roomId ?? rooms.data.items.find((r) => r.isDefault)?.id ?? rooms.data.items[0]?.id;

  return (
    <>
      <PageHeader title={t('title', { name: group.data.name })} subtitle={t('readonly')} />
      <Link href="/groups" className={styles.back}>
        {t('back')}
      </Link>
      <div className={styles.wrap}>
        <nav className={styles.rooms} aria-label={t('rooms')}>
          {rooms.data.items.map((r) => (
            <button
              key={r.id}
              type="button"
              aria-current={r.id === active ? 'true' : undefined}
              className={`${styles.room} ${r.id === active ? styles.roomOn : ''}`}
              onClick={() => setRoomId(r.id)}
            >
              # {r.name}
            </button>
          ))}
        </nav>
        <section className={styles.pane}>{active ? <Messages roomId={active} /> : null}</section>
      </div>
    </>
  );
}
