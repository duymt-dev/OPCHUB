'use client';
import { AdminTable, EmptyState, StatusTag } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { formatVnd, formatDate } from '@/features/membership';
import type { DirectorRegion } from '../types';
import { monthLabel } from '../model';
import styles from './my-region.module.css';

export function MyRegionMonths({ rows }: { rows: DirectorRegion['months'] }) {
  const t = useTranslations('affiliate.region');
  return (
    <section>
      <h3>{t('monthsTitle')}</h3>
      <div className={styles.table}>
        <AdminTable
          rowKey="monthKey"
          data={rows}
          pagination={false}
          empty={<EmptyState title={t('emptyMonths')} />}
          columns={[
            {
              title: t('month'),
              key: 'month',
              render: (_, r) => <b>{t('monthValue', { month: monthLabel(r.monthKey) })}</b>,
            },
            {
              title: t('amount'),
              key: 'amount',
              width: 170,
              render: (_, r) => <b className={styles.money}>{formatVnd(r.amount)}</b>,
            },
            {
              title: t('status'),
              key: 'status',
              width: 130,
              render: (_, r) => (
                <StatusTag tone={r.status === 'paid' ? 'green' : 'amber'}>
                  {t(`statusLabels.${r.status}`)}
                </StatusTag>
              ),
            },
            {
              title: t('paidAt'),
              key: 'paidAt',
              width: 150,
              render: (_, r) => (r.paidAt ? formatDate(r.paidAt) : '—'),
            },
          ]}
        />
      </div>
    </section>
  );
}
