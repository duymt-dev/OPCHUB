'use client';

import { AdminTable } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { affiliateDate, affiliateMoney } from '../format';
import { affiliateMonthLabel } from '../model';
import type { AffiliateCustomer, AffiliateDetailParams } from '../types';
import { CommissionStatus } from './commission-status';
import styles from './affiliate.module.css';

function PayoutHistory({ row }: { row: AffiliateCustomer }) {
  const t = useTranslations('affiliate');
  if (row.status === 'paid')
    return row.bank ? (
      <div className={styles.stack}>
        <span>
          {row.bank.bankHolder} · {row.bank.bankName}
        </span>
        <span>
          {row.bank.bankNo} · {affiliateMoney(row.commission)}
        </span>
        <span className={styles.hint}>{affiliateDate(row.paidAt)}</span>
      </div>
    ) : (
      <span>—</span>
    );
  if (row.status === 'cancelled') return <span>{t('cancelledPayout')}</span>;
  if (row.status !== 'recorded') return <span>—</span>;
  const month = new Date(Date.parse(row.date) + 7 * 3_600_000).toISOString().slice(0, 7);
  return (
    <span className={styles.hint}>{t('pendingPayout', { month: affiliateMonthLabel(month) })}</span>
  );
}

export function CustomersTable({
  rows,
  total,
  params,
  update,
  header,
  loading,
}: {
  rows: AffiliateCustomer[];
  total: number;
  params: AffiliateDetailParams;
  update: (patch: Partial<AffiliateDetailParams>) => void;
  header: ReactNode;
  loading: boolean;
}) {
  const t = useTranslations('affiliate');
  return (
    <div className={styles.tableHost}>
      <AdminTable<AffiliateCustomer>
        rowKey="id"
        title={header}
        data={rows}
        total={total}
        loading={loading}
        empty={t('empty')}
        page={params.page}
        pageSize={params.size}
        onPageChange={(page, size) => update({ page, size })}
        columns={[
          { title: t('tabs.customers'), dataIndex: 'name' },
          { title: t('columns.date'), key: 'date', render: (_, row) => affiliateDate(row.date) },
          { title: t('columns.rate'), key: 'rate', render: (_, row) => `${row.rate}%` },
          {
            title: t('columns.commission'),
            key: 'commission',
            render: (_, row) => affiliateMoney(row.commission),
          },
          {
            title: t('columns.status'),
            key: 'status',
            render: (_, row) => <CommissionStatus status={row.status} reason={row.cancelReason} />,
          },
          {
            title: t('columns.payoutHistory'),
            key: 'history',
            render: (_, row) => <PayoutHistory row={row} />,
          },
        ]}
      />
    </div>
  );
}
