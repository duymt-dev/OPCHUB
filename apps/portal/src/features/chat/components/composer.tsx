'use client';

import type { RoomMember } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { applyMention, insertAt, mentionedNames, mentionQuery } from '../format';
import type { SendArgs } from '../hooks/use-message-actions';
import type { ReplyTarget } from '../types';
import { ComposerTools, MentionList, ReplyBar } from './composer-parts';
import styles from './composer.module.css';

interface Props {
  roomName: string;
  me: string;
  people: RoomMember[];
  reply: ReplyTarget | null;
  onCancelReply: () => void;
  onSend: (a: SendArgs) => void;
}

/** Tệp mẫu của prototype — chưa có upload thật (D-36 / adapter storage làm sau) */
const DEMO_FILE = { name: 'Ke-hoach-Q4.pdf', size: '640 KB', ext: 'PDF' };
const DEMO_IMAGE = { name: 'anh-tai-len.jpg', size: '', ext: 'IMG' };

/** Ô soạn tin: Enter để gửi, đính kèm file/ảnh, @nhắc tên có gợi ý, thanh trả lời */
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
            onFile={() => onSend({ kind: 'file', attachment: DEMO_FILE, ...replyTo })}
            onImage={() => onSend({ kind: 'image', attachment: DEMO_IMAGE, ...replyTo })}
            onMention={() => setDraft(insertAt)}
            onSend={send}
          />
        </div>
      </div>
    </>
  );
}
