'use client';

import { CHAT_EMOJIS } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import type { KeyboardEvent } from 'react';
import { messageTime } from '../format';
import type { MessageView } from '../types';
import { MessageContent, MessageMeta, SenderAvatar } from './message-body';
import styles from './message-row.module.css';

export interface MessageRowActions {
  select: (id: string | null) => void;
  react: (id: string, emoji: string) => void;
  reply: (view: MessageView) => void;
  pin: (id: string, pinned: boolean) => void;
  report: (view: MessageView) => void;
}

interface Props {
  view: MessageView;
  selected: boolean;
  canPin: boolean;
  me: string;
  meAvatar: string | null;
  q: string;
  actions: MessageRowActions;
}

const ROLE_KEY = { owner: 'roleOwner', system: 'roleSystem' } as const;

/** Một dòng tin; bấm để chọn → thanh cảm xúc, Trả lời, Ghim/Bỏ ghim, Báo cáo */
export function MessageRow({ view, selected, canPin, me, meAvatar, q, actions }: Props) {
  const t = useTranslations('chat');
  const { msg, showHead, mine, match } = view;
  const role = msg.senderRole
    ? t(`messages.${ROLE_KEY[msg.senderRole]}`)
    : mine
      ? t('messages.roleMe')
      : null;
  const canReport = !mine && !msg.reportedByMe && msg.senderRole !== 'system';
  const toggle = () => actions.select(selected ? null : msg.id);
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && e.target === e.currentTarget) toggle();
  };
  const cls = [
    styles.row,
    showHead ? '' : styles.cont,
    mine ? styles.mine : '',
    match ? '' : styles.dim,
  ];

  return (
    <div
      role="option"
      tabIndex={0}
      aria-selected={selected}
      className={cls.join(' ')}
      onClick={toggle}
      onKeyDown={onKey}
    >
      <div className={styles.av}>
        {showHead ? <SenderAvatar msg={msg} meAvatar={meAvatar} /> : null}
      </div>
      <div className={styles.body}>
        {showHead ? (
          <div className={styles.head}>
            <span className={styles.who}>{msg.sender.name}</span>
            {role ? (
              <span className={styles.role} data-role={msg.senderRole ?? 'me'}>
                {role}
              </span>
            ) : null}
            <span className={styles.time}>
              {messageTime(msg.createdAt, t('messages.yesterday'))}
            </span>
          </div>
        ) : null}
        {msg.replyTo ? (
          <div className={styles.quote}>
            <b>{msg.replyTo.name}</b>
            <div className={styles.quoteText}>{msg.replyTo.text}</div>
          </div>
        ) : null}
        <MessageContent msg={msg} me={me} q={q} />
        <MessageMeta msg={msg} onReact={(e) => actions.react(msg.id, e)} />
      </div>
      {selected ? (
        <ActionBar view={view} canPin={canPin} canReport={canReport} actions={actions} />
      ) : null}
    </div>
  );
}

function ActionBar({
  view,
  canPin,
  canReport,
  actions,
}: {
  view: MessageView;
  canPin: boolean;
  canReport: boolean;
  actions: MessageRowActions;
}) {
  const t = useTranslations('chat');
  const { msg } = view;
  const run = (fn: () => void) => () => {
    fn();
    actions.select(null);
  };
  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- chỉ chặn nổi bọt
    <div className={styles.bar} onClick={(e) => e.stopPropagation()}>
      {CHAT_EMOJIS.map((e) => (
        <button
          key={e}
          type="button"
          className={styles.emoji}
          onClick={run(() => actions.react(msg.id, e))}
        >
          {e}
        </button>
      ))}
      <i className={styles.sep} />
      <button type="button" className={styles.act} onClick={run(() => actions.reply(view))}>
        {t('messages.reply')}
      </button>
      {canPin ? (
        <button
          type="button"
          className={styles.act}
          onClick={run(() => actions.pin(msg.id, !msg.pinned))}
        >
          {msg.pinned ? t('pin.unpin') : t('pin.pin')}
        </button>
      ) : null}
      {canReport ? (
        <button
          type="button"
          className={`${styles.act} ${styles.danger}`}
          onClick={run(() => actions.report(view))}
        >
          {t('messages.report')}
        </button>
      ) : null}
    </div>
  );
}
