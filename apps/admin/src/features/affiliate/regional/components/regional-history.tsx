'use client';
import type { RegionalDirectors } from '@opchub/shared/api-domains';
import { useDomainLabels } from '@/i18n/domain-labels';
import { formatDate } from '@/i18n/format';
import { useLocale, useTranslations } from 'next-intl';
import styles from './regional.module.css';

export function RegionalHistory({ items }: { items: RegionalDirectors['history'] }) {
  const locale = useLocale();
  const labels = useDomainLabels();
  const t = useTranslations('affiliate.regional');
  if (!items.length) return null;
  return (
    <section className={styles.history}>
      <b>{t('history')}</b>
      {items.map((e) => (
        <div key={e.id}>
          <time>
            {formatDate(e.createdAt, locale, {
              timeZone: 'Asia/Ho_Chi_Minh',
              hour: '2-digit',
              minute: '2-digit',
              hourCycle: 'h23',
            })}{' '}
            {formatDate(e.createdAt, locale, {
              timeZone: 'Asia/Ho_Chi_Minh',
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })}
          </time>
          <b className={e.action === 'appoint' ? styles.good : styles.danger}>{t(e.action)}</b>
          <span>
            {e.userName} · {labels.region(e.region, true)}
          </span>
          <span>{t('by', { role: e.actorRole })}</span>
        </div>
      ))}
    </section>
  );
}
