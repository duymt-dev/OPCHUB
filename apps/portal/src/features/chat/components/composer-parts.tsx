'use client';

import type { RoomMember } from '@opchub/shared/api-domains';
import { UserAvatar } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import type { ReplyTarget } from '../types';
import styles from './composer.module.css';

export function ReplyBar({ target, onCancel }: { target: ReplyTarget; onCancel: () => void }) {
  const t = useTranslations('chat.composer');
  return (
    <div className={styles.reply}>
      <i className={styles.replyBar} />
      <div className={styles.replyText}>
        <span className={styles.replyWho}>{t('replyingTo', { name: target.name })}</span>
        <div className={styles.replyQuote}>{target.text}</div>
      </div>
      <button
        type="button"
        aria-label={t('cancelReply')}
        className={styles.replyClose}
        onClick={onCancel}
      >
        ×
      </button>
    </div>
  );
}

export function MentionList({
  people,
  onPick,
}: {
  people: RoomMember[];
  onPick: (n: string) => void;
}) {
  const t = useTranslations('chat.composer');
  return (
    <div className={styles.mentions}>
      <div className={styles.mentionsTitle}>{t('mentionTitle')}</div>
      {people.map((p) => (
        <button key={p.id} type="button" className={styles.person} onClick={() => onPick(p.name)}>
          <UserAvatar name={p.name} size={32} src={p.avatarUrl ?? undefined} />
          <span className={styles.personName}>{p.name}</span>
          <span className={styles.personTitle}>{p.title}</span>
        </button>
      ))}
    </div>
  );
}

const ATTACH = 'M21 12l-8.5 8.5a5 5 0 01-7-7L14 5a3.5 3.5 0 015 5l-8.5 8.5a2 2 0 01-3-3L15 8';
const IMAGE = 'M6 3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6a3 3 0 013-3zM21 15l-5-5L5 21';
const SEND = 'M22 2L11 13M22 2l-7 20-4-9-9-4z';

export function ToolIcon({ kind }: { kind: 'attach' | 'image' | 'send' }) {
  const size = kind === 'send' ? 14 : 16;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={kind === 'send' ? 2.2 : 1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={kind === 'attach' ? ATTACH : kind === 'image' ? IMAGE : SEND} />
      {kind === 'image' ? <circle cx="9" cy="9" r="2" /> : null}
    </svg>
  );
}

interface ToolsProps {
  ready: boolean;
  onFile: () => void;
  onImage: () => void;
  onMention: () => void;
  onSend: () => void;
}

/** Hàng công cụ dưới ô soạn: Đính kèm file · Gửi ảnh · @ · "Enter để gửi" · Gửi */
export function ComposerTools({ ready, onFile, onImage, onMention, onSend }: ToolsProps) {
  const t = useTranslations('chat.composer');
  const tool = (key: 'attach' | 'image' | 'mention', onClick: () => void) => (
    <button
      type="button"
      title={t(key)}
      aria-label={t(key)}
      className={styles.tool}
      onClick={onClick}
    >
      {key === 'mention' ? '@' : <ToolIcon kind={key} />}
    </button>
  );
  return (
    <div className={styles.tools}>
      {tool('attach', onFile)}
      {tool('image', onImage)}
      {tool('mention', onMention)}
      <span className={styles.hint}>{t('hint')}</span>
      <button
        type="button"
        title={t('send')}
        data-ready={ready}
        className={styles.send}
        onClick={onSend}
      >
        <ToolIcon kind="send" />
        {t('send')}
      </button>
    </div>
  );
}
