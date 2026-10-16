'use client';

import type { LiveActivity } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { useAgo } from '../hooks/use-ago';
import { Avatar } from './avatar';
import styles from './activity-feed.module.css';
import card from './dashboard.module.css';

/** Màu + ký hiệu nhỏ góc ảnh theo loại hoạt động (prototype ACT) */
const KIND = {
  msg: ['#52C41A', '✉'],
  join: ['#1677FF', '+'],
  event: ['#FAAD14', '★'],
  login: ['#4096FF', '●'],
} as const;

/** "Hoạt động trực tiếp" — 6 hoạt động gần nhất */
export function ActivityFeed({ items, now }: { items: LiveActivity[]; now: number }) {
  const t = useTranslations('dashboard.acts');
  const ago = useAgo(now);
  return (
    <section className={card.card}>
      <div className={card.cardHead}>
        <div className={card.cardTitle}>{t('title')}</div>
        <span className={styles.realtime}>
          <i className={styles.blink} />
          {t('realtime')}
        </span>
      </div>
      {items.map((a) => {
        const [color, mark] = KIND[a.kind];
        return (
          <div key={a.id} className={styles.row}>
            <div className={styles.face}>
              <Avatar src={a.avatarUrl} size={34} />
              <span className={styles.mark} style={{ background: color }}>
                {mark}
              </span>
            </div>
            <div className={styles.text}>
              <b>{a.memberName}</b> {t(a.kind)} {a.target ? <b>{a.target}</b> : null}
              <div className={styles.ago}>{ago.live(a.at)}</div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
