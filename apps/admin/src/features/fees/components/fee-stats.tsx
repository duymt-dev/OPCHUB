'use client';

import type { FeeSummary } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { vnd } from '../model';
import styles from './fees.module.css';

/** 6 thẻ thống kê v4.2: tổng, đã đóng, miễn phí 3 tháng, hết hạn, sắp hết hạn, doanh thu năm (D-101) */
export function FeeStats({ summary }: { summary: FeeSummary | undefined }) {
  const t = useTranslations('fees.stats');
  const s = summary;
  const items = [
    { key: 'total', value: s ? String(s.total) : '—' },
    { key: 'paid', value: s ? String(s.paid) : '—' },
    { key: 'trial', value: s ? String(s.trial) : '—' },
    { key: 'expired', value: s ? String(s.expired) : '—' },
    { key: 'soon', value: s ? String(s.expiring) : '—' },
    { key: 'revenue', value: s ? vnd(s.revenue) : '—' },
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
