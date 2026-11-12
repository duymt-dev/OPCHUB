'use client';
import type { RenewalRow } from '@opchub/shared/api-domains';
import { useLocale, useTranslations, useNow } from 'next-intl';
import { formatDate } from '@/i18n/format';
import { useRelTime } from '../hooks/use-rel-time';
import styles from './renewal.module.css';
import { useNumberText } from '@/i18n/use-number-text';

export function RenewalExpiry({ row: r }: { row: RenewalRow }) {
  const numberText = useNumberText();
  const t = useTranslations('settings.renewal'),
    locale = useLocale();
  return (
    <div className={styles.stack}>
      <span>
        {formatDate(r.validUntil, locale, {
          timeZone: 'Asia/Ho_Chi_Minh',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })}
      </span>
      <small className={r.daysLeft <= 7 ? styles.urgent : styles.soon}>
        {t('left', { n: numberText(r.daysLeft) })}
      </small>
    </div>
  );
}
export function RenewalLastSent({ at }: { at: string | null }) {
  const now = useNow({ updateInterval: 60000 });
  const t = useTranslations('settings.renewal'),
    rel = useRelTime();
  return (
    <span className={at ? styles.sent : styles.muted}>
      {at
        ? now.getTime() - Date.parse(at) < 60000
          ? t('justSent')
          : t('lastSent', { time: rel(at) })
        : t('never')}
    </span>
  );
}
