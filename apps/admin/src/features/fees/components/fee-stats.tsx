'use client';

import type { FeeSummary } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { vnd } from '../model';
import styles from './fees.module.css';

/** 5 thẻ thống kê: tổng, đã đóng, chờ thanh toán, sắp hết hạn, doanh thu năm */
export function FeeStats({ summary }: { summary: FeeSummary | undefined }) {
  const t = useTranslations('fees.stats');
  const s = summary;
  const items = [
    { key: 'total', value: s ? String(s.total) : '—' },
    { key: 'paid', value: s ? String(s.paid) : '—' },
    { key: 'pending', value: s ? String(s.pending_payment) : '—' },
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
