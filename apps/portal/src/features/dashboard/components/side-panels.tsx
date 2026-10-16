'use client';

import type { LiveMessage, LiveSession } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { useAgo } from '../hooks/use-ago';
import { fmtNumber } from '../model';
import { Avatar } from './avatar';
import card from './dashboard.module.css';
import styles from './side-panels.module.css';

/** "Tin nhắn mới nhất" — 6 tin gần nhất trên toàn cộng đồng */
export function LatestMessages({
  items,
  today,
  now,
}: {
  items: LiveMessage[];
  today: number;
  now: number;
}) {
  const t = useTranslations('dashboard.messages');
  const ago = useAgo(now);
  return (
    <section className={card.card}>
      <div className={card.cardHead}>
        <div className={card.cardTitle}>{t('title')}</div>
        <span className={card.cardMeta}>{t('today', { n: fmtNumber(today) })}</span>
      </div>
      <div className={styles.box}>
        {items.map((m) => (
          <div key={m.id} className={styles.msg}>
            <Avatar src={m.avatarUrl} size={30} />
            <div className={styles.msgText}>
              <div className={styles.msgHead}>
                <b>{m.memberName}</b>
                <span className={styles.room} style={{ background: m.tone.bg, color: m.tone.fg }}>
                  {m.roomName}
                </span>
                <span className={styles.ago}>{ago.live(m.at)}</span>
              </div>
              <span className={styles.body}>{m.body}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const DOT = { done: '#D9D9D9', live: '#52C41A', next: '#1677FF' } as const;

/** "Hoạt động trong ngày" — lịch; phiên đang diễn ra có thanh tiến độ */
export function DaySessions({ items }: { items: LiveSession[] }) {
  const t = useTranslations('dashboard.sessions');
  return (
    <section className={card.card}>
      <div className={card.cardTitle}>{t('title')}</div>
      {items.map((s) => (
        <div key={s.name} className={styles.session}>
          <div className={styles.sessionRow}>
            <i className={styles.sessionDot} style={{ background: DOT[s.state] }} />
            <span className={styles.sessionName} data-live={s.state === 'live'}>
              {s.name}
            </span>
            <span className={styles.sessionTime}>{s.time}</span>
          </div>
          {s.state === 'live' ? (
            <div className={styles.progress}>
              <span className={styles.progressBar}>
                <span style={{ width: `${s.progressPct}%` }} />
              </span>
              <span className={styles.attendees}>{t('attendees', { n: s.attendees })}</span>
            </div>
          ) : null}
        </div>
      ))}
    </section>
  );
}
