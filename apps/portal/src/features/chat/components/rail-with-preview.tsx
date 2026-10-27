'use client';

import { useState } from 'react';
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
  const [previewId, setPreviewId] = useState<string | null>(null);
  const preview = others.find((g) => g.id === previewId) ?? null;

  /** D-71 vào nhóm ngay, nhưng cần đồng ý nội quy + phí (NR-R02) → form tham gia ở Cộng đồng */
  const join = (g: ChatGroup) => url.push(`/community?join=${encodeURIComponent(g.id)}`);

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
