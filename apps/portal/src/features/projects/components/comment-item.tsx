'use client';

import type { ProjectCommentView } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { COMMENT_TONE } from '../model';
import { Face, Tag } from './bits';
import styles from './comments.module.css';

interface Props {
  c: ProjectCommentView;
  isOwner: boolean;
  replying: boolean;
  ago: (iso: string) => string;
  onToggleReply: () => void;
  onLike: () => void;
  onAck: () => void;
  onReply: (body: string) => void;
}

/** Các câu trả lời dưới một góp ý */
function Replies({ c, ago }: Pick<Props, 'c' | 'ago'>) {
  const t = useTranslations('projects.comments');
  return (
    <>
      {c.replies.map((r) => (
        <div key={`${r.createdAt}-${r.author.name}`} className={styles.reply}>
          <Face name={r.author.name} src={r.author.avatarUrl} size={28} />
          <div className={styles.replyBody}>
            <div className={styles.replyHead}>
              <b className={styles.replyWho}>{r.author.name}</b>
              {r.isOwner ? (
                <Tag tone="blue" size="sm">
                  {t('owner')}
                </Tag>
              ) : null}
              <span className={styles.ago}>{ago(r.createdAt)}</span>
            </div>
            <span className={styles.replyText}>{r.body}</span>
          </div>
        </div>
      ))}
    </>
  );
}

function CommentActions({
  c,
  isOwner,
  onToggleReply,
  onLike,
  onAck,
}: Pick<Props, 'c' | 'isOwner' | 'onToggleReply' | 'onLike' | 'onAck'>) {
  const t = useTranslations('projects.comments');
  return (
    <div className={styles.actions}>
      <button
        type="button"
        aria-pressed={c.likedByMe}
        className={`${styles.act} ${c.likedByMe ? styles.liked : ''}`}
        onClick={onLike}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill={c.likedByMe ? '#E6F4FF' : 'none'}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M7 10v11H4a1 1 0 01-1-1v-9a1 1 0 011-1zM7 10l4-8a3 3 0 013 3v4h5.5a2 2 0 012 2.3l-1.4 8A2 2 0 0118.1 21H7" />
        </svg>
        {t('useful', { n: c.likes })}
      </button>
      <button type="button" className={`${styles.act} ${styles.replyAct}`} onClick={onToggleReply}>
        {t('reply')}
      </button>
      {isOwner ? (
        <button type="button" className={`${styles.act} ${styles.ack}`} onClick={onAck}>
          {c.resolved ? t('unack') : t('ack')}
        </button>
      ) : null}
    </div>
  );
}

/** Một góp ý + trả lời + ô "Viết trả lời..." */
export function CommentItem(props: Props) {
  const { c, isOwner, replying, ago, onToggleReply, onLike, onAck, onReply } = props;
  const t = useTranslations('projects.comments');
  const [text, setText] = useState('');
  const send = () => {
    const body = text.trim();
    if (!body) return;
    onReply(body);
    setText('');
  };
  return (
    <div className={styles.item}>
      <Face name={c.author.name} src={c.author.avatarUrl} size={36} />
      <div className={styles.itemBody}>
        <div className={styles.itemHead}>
          <b className={styles.who}>{c.author.name}</b>
          <span className={styles.role}>{c.author.title}</span>
          <Tag tone={COMMENT_TONE[c.type]} size="sm">
            {t(c.type)}
          </Tag>
          {c.resolved ? (
            <Tag tone="green" size="sm">
              {t('resolved')}
            </Tag>
          ) : null}
          <span className={styles.ago}>{ago(c.createdAt)}</span>
        </div>
        <span className={styles.text}>{c.body}</span>
        <CommentActions
          c={c}
          isOwner={isOwner}
          onToggleReply={onToggleReply}
          onLike={onLike}
          onAck={onAck}
        />
        <Replies c={c} ago={ago} />
        {replying ? (
          <div className={styles.replyBox}>
            <input
              className={styles.replyInput}
              value={text}
              placeholder={t('replyPh')}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
            />
            <button type="button" className={styles.replySend} onClick={send}>
              {t('send')}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
