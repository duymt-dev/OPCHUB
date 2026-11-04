'use client';
import type { RegionalDirectors } from '@opchub/shared/api-domains';
import { REGIONAL_LABELS } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import styles from './regional.module.css';

export function RegionalHistory({ items }: { items: RegionalDirectors['history'] }) {
  const t = useTranslations('affiliate.regional');
  if (!items.length) return null;
  return (
    <section className={styles.history}>
      <b>{t('history')}</b>
      {items.map((e) => (
        <div key={e.id}>
          <time>
            {new Intl.DateTimeFormat('vi-VN', {
              timeZone: 'Asia/Ho_Chi_Minh',
              hour: '2-digit',
              minute: '2-digit',
              hourCycle: 'h23',
            }).format(new Date(e.createdAt))}{' '}
            {new Intl.DateTimeFormat('vi-VN', {
              timeZone: 'Asia/Ho_Chi_Minh',
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            }).format(new Date(e.createdAt))}
          </time>
          <b className={e.action === 'appoint' ? styles.good : styles.danger}>{t(e.action)}</b>
          <span>
            {e.userName} · {REGIONAL_LABELS[e.region]}
          </span>
          <span>{t('by', { role: e.actorRole })}</span>
        </div>
      ))}
    </section>
  );
}
