'use client';

import { useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useRoomActions } from '../hooks/use-room-actions';
import type { ChatGroup } from '../types';
import { GroupPreview } from './group-preview';
import { GroupRail } from './group-rail';

interface Props {
  joined: ChatGroup[];
  others: ChatGroup[];
  activeId: string | null;
  url: { go: (gid: string) => void; push: (href: string) => void };
}

/** Rail nhóm + lớp xem trước nhóm chưa tham gia (P-46) */
export function RailWithPreview({ joined, others, activeId, url }: Props) {
  const t = useTranslations('chat.preview');
  const toast = useToast();
  const [previewId, setPreviewId] = useState<string | null>(null);
  const acts = useRoomActions(null);
  const preview = others.find((g) => g.id === previewId) ?? null;

  /** D-71: tham gia ngay, vào phòng Chung của nhóm */
  const join = (g: ChatGroup) => {
    void acts.join(g.id).then(() => {
      setPreviewId(null);
      toast(t('joined', { name: g.name }));
      url.go(g.id);
    });
  };

  return (
    <>
      {preview ? (
        <GroupPreview group={preview} onClose={() => setPreviewId(null)} onJoin={join} />
      ) : null}
      <GroupRail
        joined={joined}
        others={others}
        activeId={activeId}
        previewId={previewId}
        onOpen={(g) => {
          setPreviewId(null);
          url.go(g.id);
        }}
        onPreview={(g) => setPreviewId(g.id)}
        onJoinMore={() => url.push('/community')}
      />
    </>
  );
}
