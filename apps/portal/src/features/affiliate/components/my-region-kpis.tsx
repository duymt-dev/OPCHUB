'use client';
import { useTranslations } from 'next-intl';
import { formatVnd } from '@/features/membership';
import type { DirectorRegion } from '../types';
import { monthLabel } from '../model';
import styles from './my-region.module.css';

export function MyRegionKpis({ data }: { data: DirectorRegion }) {
  const t = useTranslations('affiliate.region');
  const values = [
    ['revenue', data.kpi.revenue, t('transactions', { count: data.kpi.count })],
    ['share', data.kpi.share, t('yearRule')],
    ['paid', data.kpi.paid, t('paidMonths', { count: data.kpi.paidMonths })],
    ['due', data.kpi.due, t('dueDate', { month: monthLabel(data.payoutDate.slice(0, 7)) })],
  ] as const;
  return (
    <div className={styles.kpis}>
      {values.map(([key, value, hint]) => (
        <div className={styles.kpi} key={key}>
          <span>{t(key)}</span>
          <b>{formatVnd(value)}</b>
          <small>{hint}</small>
        </div>
      ))}
    </div>
  );
}
