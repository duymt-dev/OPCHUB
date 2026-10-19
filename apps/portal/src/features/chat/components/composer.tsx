'use client';

import type { RoomMember } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { applyMention, insertAt, mentionedNames, mentionQuery } from '../format';
import { type AttachKind, useAttachmentUpload } from '../hooks/use-attachment-upload';
import type { SendArgs } from '../hooks/use-message-actions';
import type { ReplyTarget } from '../types';
import { ComposerTools, FileInput, MentionList, ReplyBar } from './composer-parts';
import styles from './composer.module.css';

interface Props {
  roomName: string;
  me: string;
  people: RoomMember[];
  reply: ReplyTarget | null;
  onCancelReply: () => void;
  onSend: (a: SendArgs) => void;
}

/** Ô soạn tin: Enter để gửi, đính kèm file/ảnh thật (presign, BUG-010), @nhắc tên, thanh trả lời */
export function Composer({ roomName, me, people, reply, onCancelReply, onSend }: Props) {
  const t = useTranslations('chat.composer');
  const toast = useToast();
  const [draft, setDraft] = useState('');
  const mq = mentionQuery(draft);
  const cand =
    mq === null
      ? []
      : people
          .filter((p) => p.name !== me)
          .filter(
            (p) =>
              mq === '' ||
              p.name
                .toLowerCase()
                .split(' ')
                .some((w) => w.startsWith(mq)),
          )
          .slice(0, 6);

  const replyTo = reply ? { replyTo: reply.id } : {};
  const send = () => {
    const body = draft.trim();
    if (!body) return;
    const names = mentionedNames(
      body,
      people.map((p) => p.name),
    );
    onSend({ kind: 'text', body, mentions: names, ...replyTo });
    setDraft('');
    if (names.length) toast(t('mentioned', { names: names.join(', ') }));
  };
  const pick = (name: string) => setDraft((d) => applyMention(d, name));
  const att = useAttachmentUpload((kind, attachment) => onSend({ kind, attachment, ...replyTo }));
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const choose = (kind: AttachKind) => {
    if (!att.busy) (kind === 'image' ? imageRef : fileRef).current?.click();
  };

  return (
    <>
      {reply ? <ReplyBar target={reply} onCancel={onCancelReply} /> : null}
      {cand.length ? <MentionList people={cand} onPick={pick} /> : null}
      <div className={styles.wrap}>
        <div className={styles.box}>
          <input
            className={styles.input}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              e.preventDefault();
              const first = cand[0];
              if (first) pick(first.name);
              else send();
            }}
            placeholder={t('placeholder', { name: roomName })}
            aria-label={t('placeholder', { name: roomName })}
          />
          <ComposerTools
            ready={Boolean(draft.trim())}
            busy={att.busy}
            onFile={() => choose('file')}
            onImage={() => choose('image')}
            onMention={() => setDraft(insertAt)}
            onSend={send}
          />
          <FileInput kind="file" inputRef={fileRef} onPick={att.upload} />
          <FileInput kind="image" inputRef={imageRef} onPick={att.upload} />
        </div>
      </div>
    </>
  );
}
