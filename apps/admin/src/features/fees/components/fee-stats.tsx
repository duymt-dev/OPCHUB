'use client';

import type { FeeSummary } from '@opchub/shared/api-domains';
import { useLocale, useTranslations } from 'next-intl';
import { vnd } from '../model';
import { formatNumber } from '@/i18n/format';
import styles from './fees.module.css';

/** 6 thẻ thống kê v4.2: tổng, đã đóng, miễn phí 3 tháng, hết hạn, sắp hết hạn, doanh thu năm (D-101) */
export function FeeStats({ summary }: { summary: FeeSummary | undefined }) {
  const locale = useLocale();
  const t = useTranslations('fees.stats');
  const s = summary;
  const items = [
    { key: 'total', value: formatNumber(s?.total, locale) },
    { key: 'paid', value: formatNumber(s?.paid, locale) },
    { key: 'trial', value: formatNumber(s?.trial, locale) },
    { key: 'expired', value: formatNumber(s?.expired, locale) },
    { key: 'soon', value: formatNumber(s?.expiring, locale) },
    { key: 'revenue', value: s ? vnd(s.revenue, locale) : '—' },
  ] as const;
  return (
    <div className={styles.stats}>
      {items.map((x) => (
        <div key={x.key} className={styles.stat}>
          <span className={styles.statLabel}>{t(x.key)}</span>
          <b className={styles.statValue}>{x.value}</b>
        </div>
      ))}
    </div>
  );
}
