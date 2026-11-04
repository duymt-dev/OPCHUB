'use client';
import { useTranslations } from 'next-intl';
import type { RegionalDirectors } from '@opchub/shared/api-domains';
import styles from './regional.module.css';

export function RegionalList({ items }: { items: RegionalDirectors['items'] }) {
  const t = useTranslations('affiliate.regional');
  return (
    <div className={styles.history}>
      {items.map((s) => (
        <div key={s.region}>
          <b>{s.member?.fullName ?? t('vacant')}</b>
          <span>{s.label}</span>
          <span>{t('provinceCount', { n: s.provinces.length })}</span>
          <span>{t('affiliateCount', { n: s.affiliateCount })}</span>
        </div>
      ))}
    </div>
  );
}
