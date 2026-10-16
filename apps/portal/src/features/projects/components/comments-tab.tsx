'use client';

import type { ProjectCommentView, ProjectDetail } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { useCommentActions } from '../hooks/use-comment-actions';
import { agoKey } from '../model';
import type { CommentType, DetailParams } from '../types';
import { CommentComposer, CommentsHead } from './comment-composer';
import { CommentItem } from './comment-item';
import styles from './comments.module.css';

interface Props {
  p: ProjectDetail;
  comments: ProjectCommentView[];
  /** Mốc "bây giờ" lúc tải góp ý (giữ thuần khi render) */
  now: number;
  params: DetailParams;
  onParams: (patch: Partial<DetailParams>) => void;
}

/** P-65 → P-67: Góp ý — sắp xếp, lọc loại, soạn, danh sách, trả lời, tiếp nhận */
export function CommentsTab({ p, comments, now, params, onParams }: Props) {
  const t = useTranslations('projects.comments');
  const tAgo = useTranslations('projects.ago');
  const toast = useToast();
  const act = useCommentActions(p.id, p.name);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const ago = (iso: string) => {
    const a = agoKey(iso, now);
    return tAgo(a.key, { n: a.n });
  };

  const list = useMemo(() => {
    const l = comments.filter((c) => params.ctype === 'all' || c.type === params.ctype);
    return [...l].sort((a, b) =>
      params.csort === 'top'
        ? b.likes - a.likes
        : Date.parse(b.createdAt) - Date.parse(a.createdAt),
    );
  }, [comments, params.csort, params.ctype]);

  const post = (type: CommentType, draft: string, done: () => void) => {
    const body = draft.trim();
    if (body.length < 5) return toast(t('tooShort'));
    act.post.mutate(
      { type, body },
      {
        onSuccess: () => {
          done();
          onParams({ ctype: 'all', csort: 'new' });
        },
      },
    );
  };

  return (
    <section className={styles.panel}>
      <CommentsHead comments={comments} params={params} onParams={onParams} />
      <CommentComposer onPost={post} />
      {list.map((c) => (
        <CommentItem
          key={c.id}
          c={c}
          isOwner={p.isOwner}
          ago={ago}
          replying={replyTo === c.id}
          onToggleReply={() => setReplyTo(replyTo === c.id ? null : c.id)}
          onLike={() => act.like.mutate(c)}
          onAck={() => act.resolve.mutate(c)}
          onReply={(body) =>
            act.reply.mutate({ id: c.id, body }, { onSuccess: () => setReplyTo(null) })
          }
        />
      ))}
      {!list.length ? <div className={styles.empty}>{t('empty')}</div> : null}
    </section>
  );
}
