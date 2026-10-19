'use client';

import { Icon, PageHeader, PageSkeleton } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { useChatUrl } from '../hooks/use-chat-url';
import { useRoomActions } from '../hooks/use-room-actions';
import { useTopicPush } from '../hooks/use-topic-push';
import { useLocation } from '../hooks/use-room-view';
import type { ChatGroup, ChatLocation } from '../types';
import styles from './chat-screen.module.css';
import { RailWithPreview } from './rail-with-preview';
import { RoomView } from './room-view';
import { NoGroupsList, TopicList } from './topic-list';

type Url = ReturnType<typeof useChatUrl>;

/** P-28 → P-48 Chat nhóm — orchestrator: khung trang + rail + chủ đề + phòng */
export function ChatScreen() {
  const t = useTranslations('chat');
  const url = useChatUrl();
  const { overview, loc, ready } = useLocation(url.groupId, url.roomKey);
  // phòng mở đầu tiên khi vào màn — đổi sang phòng khác thì danh sách tin cuộn xuống cuối
  const roomId = loc.room?.id;
  const [firstRoom, setFirstRoom] = useState(roomId);
  if (firstRoom === undefined && roomId) setFirstRoom(roomId);
  return (
    <>
      <PageHeader
        title={t('page.title')}
        subtitle={t('page.sub')}
        extra={
          <div className={styles.range}>
            <Icon name="calendar" stroke="rgba(0,0,0,0.65)" />
            {t('page.dateRange')}
            <Icon name="chevronDown" size={14} stroke="rgba(0,0,0,0.45)" />
          </div>
        }
      />
      <div className={styles.frame} data-screen-label="Portal · Chat nhóm">
        {ready && overview.data ? (
          <>
            <RailWithPreview
              joined={overview.data.joined}
              others={overview.data.others}
              activeId={loc.group?.id ?? null}
              url={url}
            />
            <ChatBody loc={loc} url={url} switched={roomId !== firstRoom} />
          </>
        ) : (
          <PageSkeleton />
        )}
      </div>
    </>
  );
}

function ChatBody({ loc, url, switched }: { loc: ChatLocation; url: Url; switched: boolean }) {
  const t = useTranslations('chat');
  const me = useAuthStore((s) => s.me);
  const { markRead } = useRoomActions(loc.group);
  useTopicPush();
  const roomId = loc.room?.id;
  const unread = loc.room?.unread ?? 0;

  useEffect(() => {
    if (roomId && unread > 0) markRead(roomId);
  }, [roomId, unread, markRead]);

  if (!loc.group || !loc.room || !me)
    return (
      <>
        <NoGroupsList />
        <div className={styles.main}>
          <div className={styles.membersOnly}>{t('list.membersOnly')}</div>
        </div>
      </>
    );
  const group: ChatGroup = loc.group;
  return (
    <>
      <TopicList
        group={group}
        rooms={loc.rooms}
        activeId={loc.room.id}
        onOpen={(r) => url.go(r.groupId, r.key)}
      />
      <RoomView
        key={loc.room.id}
        group={group}
        room={loc.room}
        me={{ id: me.id, name: me.fullName, avatarUrl: me.avatarUrl }}
        url={url}
        switched={switched}
      />
    </>
  );
}
