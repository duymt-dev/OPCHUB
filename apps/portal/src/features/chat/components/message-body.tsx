'use client';

import { UserAvatar } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { tokenize } from '../format';
import type { ChatMessage } from '../types';
import styles from './message-row.module.css';

/** Avatar theo loại người gửi: bot / hệ thống / ảnh / chữ cái đầu */
export function SenderAvatar({ msg, meAvatar }: { msg: ChatMessage; meAvatar: string | null }) {
  if (msg.senderRole === 'system') return <div className={styles.sysAv}>✓</div>;
  const src = msg.sender.avatarUrl ?? meAvatar ?? undefined;
  return <UserAvatar name={msg.sender.name} size={36} src={src} color="#1677FF" />;
}

/** Nội dung: chữ (tô @nhắc tên + đoạn khớp tìm), file đính kèm hoặc ảnh */
export function MessageContent({ msg, me, q }: { msg: ChatMessage; me: string; q: string }) {
  const t = useTranslations('chat.messages');
  if (msg.kind === 'file' && msg.attachment)
    return (
      <div className={styles.file}>
        <div className={styles.ext}>{msg.attachment.ext}</div>
        <div className={styles.fileInfo}>
          <div className={styles.fileName}>{msg.attachment.name}</div>
          <div className={styles.fileSize}>{msg.attachment.size}</div>
        </div>
        <span className={styles.download}>{t('download')}</span>
      </div>
    );
  if (msg.kind === 'image' && msg.attachment)
    return <div className={styles.image}>{msg.attachment.name}</div>;
  return (
    <div className={styles.text}>
      {tokenize(msg.body, me, q).map((tk, i) => {
        if (tk.kind === 'mention')
          return (
            <span key={i} className={`${styles.mention} ${tk.me ? styles.mentionMe : ''}`}>
              {tk.text}
            </span>
          );
        if (tk.kind === 'hit')
          return (
            <mark key={i} className={styles.hit}>
              {tk.text}
            </mark>
          );
        return <span key={i}>{tk.text}</span>;
      })}
    </div>
  );
}

/** Cảm xúc (bấm để bật/tắt của mình) + nhãn "Đã ghim" / "Bạn đã báo cáo tin này" */
export function MessageMeta({ msg, onReact }: { msg: ChatMessage; onReact: (e: string) => void }) {
  const t = useTranslations('chat');
  return (
    <>
      {msg.reactions.length ? (
        <div className={styles.reacts}>
          {msg.reactions.map((r) => (
            <button
              key={r.emoji}
              type="button"
              title={r.names.join(', ')}
              aria-pressed={msg.myReactions.includes(r.emoji)}
              className={styles.react}
              onClick={(e) => {
                e.stopPropagation();
                onReact(r.emoji);
              }}
            >
              {r.emoji} <span className={styles.reactN}>{r.count}</span>
            </button>
          ))}
        </div>
      ) : null}
      {msg.pinned || msg.reportedByMe ? (
        <div className={styles.tags}>
          {msg.pinned ? <span className={styles.tagPinned}>{t('pin.pinned')}</span> : null}
          {msg.reportedByMe ? (
            <span className={styles.tagReported}>{t('messages.reported')}</span>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
