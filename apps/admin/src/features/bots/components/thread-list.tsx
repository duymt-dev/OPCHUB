'use client';

import type { BotThread } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { agoOf, initialOf } from '../model';
import { PersonaAvatar } from './bits';
import styles from './bots.module.css';
import c from './cards.module.css';
import s from './threads.module.css';

interface Props {
  threads: BotThread[];
  now: number;
  busy: boolean;
  onStop: (t: BotThread) => void;
}

/** D-41 tab Hội thoại: hội thoại đã đăng / chờ duyệt ("Bỏ" / "Duyệt & đăng", D-04) */
export function ThreadList({ threads, now, busy, onStop }: Props) {
  const t = useTranslations('bots');
  if (!threads.length) return <div className={styles.empty}>{t('thread.empty')}</div>;
  return (
    <div className={s.list}>
      {threads.map((th) => {
        const a = agoOf(th.createdAt, now);
        const pending = th.status !== 'done';
        return (
          <div key={th.id} className={s.thread}>
            <div className={s.head}>
              <b className={s.topic}>{th.topic}</b>
              {th.isAuto ? <span className={`${s.tag} ${s.auto}`}>{t('thread.auto')}</span> : null}
              {th.live ? <span className={`${s.tag} ${s.live}`}>{t('thread.live')}</span> : null}
              <span className={s.meta}>
                {th.groupNames.join(', ')} · {t(`ago.${a.key}`, { n: a.n })}
              </span>
              <span className={`${s.tag} ${pending ? s.pending : s.posted}`}>
                {t(`thread.${th.status}`)} ·{' '}
                {t('thread.progress', { current: th.cursor, total: th.total })}
              </span>
            </div>
            {th.lines.map((l, i) => (
              <div key={`${th.id}-${i}`} className={s.line}>
                <PersonaAvatar
                  name={l.name}
                  initial={initialOf(l.name)}
                  color={l.color}
                  photo={l.avatarUrl}
                  size={28}
                />
                <div className={s.lineText}>
                  <span className={s.who}>
                    <b>{l.name}</b> · {l.title}
                  </span>
                  <span className={s.body}>{l.body}</span>
                </div>
              </div>
            ))}
            {pending ? (
              <div className={s.actions}>
                <button type="button" className={c.btn} disabled={busy} onClick={() => onStop(th)}>
                  {t('thread.stop')}
                </button>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
