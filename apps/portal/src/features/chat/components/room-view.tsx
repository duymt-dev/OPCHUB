'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { usePanelData } from '../hooks/use-chat-data';
import { useMessageActions } from '../hooks/use-message-actions';
import { useRoomActions } from '../hooks/use-room-actions';
import { useMessageViews } from '../hooks/use-room-view';
import type { ChatGroup, ChatRoom, MessageView, PanelTab, ReplyTarget } from '../types';
import { Composer } from './composer';
import { InfoPanel } from './info-panel';
import { MessageList } from './message-list';
import { PinBanner } from './pin-banner';
import { ReportModal } from './report-modal';
import { RoomTop } from './room-header';
import styles from './chat-screen.module.css';

interface Props {
  group: ChatGroup;
  room: ChatRoom;
  me: { id: string; name: string; avatarUrl: string | null };
  switched: boolean;
  url: {
    q: string;
    searchOpen: boolean;
    panel: PanelTab | null;
    setQ: (v: string) => void;
    toggleSearch: () => void;
    setPanel: (t: PanelTab | null) => void;
    go: (gid: string, key?: string) => void;
  };
}

const replyOf = (v: MessageView, image: string): ReplyTarget => ({
  id: v.msg.id,
  name: v.msg.sender.name,
  text: v.msg.body || (v.msg.kind === 'image' ? image : (v.msg.attachment?.name ?? '')),
});

/** Cột chat + bảng thông tin của một phòng */
export function RoomView({ group, room, me, url, switched }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [reply, setReply] = useState<ReplyTarget | null>(null);
  const [reporting, setReporting] = useState<MessageView | null>(null);
  const { views, hits } = useMessageViews(room.id, me.id, url.q);
  const msgs = useMessageActions(room.id);
  const roomActs = useRoomActions(group);
  const { pins, members } = usePanelData(room.id);
  const canPin = group.isOwner;
  const tRoom = useTranslations('chat.messages');
  const unpin = (id: string) => msgs.pin(id, false);

  return (
    <>
      <div className={styles.main}>
        <RoomTop room={room} group={group} hits={hits} url={url} />
        <PinBanner key={`pin-${room.id}`} pins={pins} canUnpin={canPin} onUnpin={unpin} />
        <MessageList
          room={room}
          groupName={group.name}
          views={views}
          selectedId={selected}
          canPin={canPin}
          me={me.name}
          meAvatar={me.avatarUrl}
          q={url.q.trim()}
          scrollOnOpen={switched}
          actions={{
            select: setSelected,
            react: msgs.react,
            pin: msgs.pin,
            reply: (v) => setReply(replyOf(v, tRoom('image'))),
            report: setReporting,
          }}
        />
        <Composer
          key={`composer-${room.id}`}
          roomName={room.name}
          me={me.name}
          people={members?.items ?? []}
          reply={reply}
          onCancelReply={() => setReply(null)}
          onSend={(a) => {
            msgs.send(a);
            setReply(null);
          }}
        />
      </div>
      {url.panel ? (
        <InfoPanel
          tab={url.panel}
          onTab={url.setPanel}
          onClose={() => url.setPanel(null)}
          isOwner={group.isOwner}
          members={members?.items ?? []}
          total={members?.total ?? room.memberCount}
          group={group}
          onOpenRoom={(key) => url.go(group.id, key)}
          pins={pins}
          canUnpin={canPin}
          onUnpin={unpin}
        />
      ) : null}
      <ReportModal
        target={reporting}
        onClose={() => setReporting(null)}
        onSubmit={(reason, note) =>
          reporting ? roomActs.report(reporting.msg.id, reason, note, room.id) : Promise.resolve()
        }
      />
    </>
  );
}
