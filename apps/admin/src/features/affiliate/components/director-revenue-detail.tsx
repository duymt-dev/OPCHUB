'use client';

import type { RevenueLedgerItem } from '@opchub/shared/api-domains';
import { AdminTable, ErrorState, PageSkeleton } from '@opchub/ui';
import { Button } from 'antd';
import { useTranslations } from 'next-intl';
import { useRevenueDetail } from '../hooks/use-revenue-sharing';
import { revenueDate, revenueMoney } from '../revenue-presentation';
import { DirectorRevenueHistory } from './director-revenue-history';
import styles from './revenue-sharing.module.css';

export function DirectorRevenueDetail({ directorId }: { directorId: string }) {
  const t = useTranslations('revenue');
  const { ledger, history } = useRevenueDetail(directorId);
  const columns = [
    {
      title: t('columns.date'),
      key: 'date',
      render: (_: unknown, row: RevenueLedgerItem) => revenueDate(row.receivedAt),
    },
    {
      title: t('columns.customer'),
      key: 'customer',
      render: (_: unknown, row: RevenueLedgerItem) => row.customerName ?? row.customerId,
    },
    {
      title: t('columns.affiliate'),
      key: 'affiliate',
      render: (_: unknown, row: RevenueLedgerItem) => row.affiliateName ?? row.affiliateId ?? '—',
    },
    {
      title: t('columns.amount'),
      key: 'amount',
      render: (_: unknown, row: RevenueLedgerItem) => revenueMoney(row.amount),
    },
    {
      title: t('columns.rate'),
      key: 'rate',
      render: (_: unknown, row: RevenueLedgerItem) =>
        t('rateYear', { rate: row.directorRate, year: row.customerYear }),
    },
    {
      title: t('columns.share'),
      key: 'share',
      render: (_: unknown, row: RevenueLedgerItem) => <b>{revenueMoney(row.directorAmount)}</b>,
    },
    {
      title: t('columns.status'),
      key: 'status',
      render: (_: unknown, row: RevenueLedgerItem) => t(row.status === 'paid' ? 'paid' : 'pending'),
    },
  ];
  return (
    <div className={styles.detail}>
      <section aria-label={t('ledger')}>
        <b>{t('ledger')}</b>
        {ledger.isError ? (
          <ErrorState
            title={t('error')}
            retryLabel={t('retry')}
            onRetry={() => void ledger.refetch()}
          />
        ) : ledger.isPending ? (
          <PageSkeleton />
        ) : (
          <>
            <AdminTable
              rowKey="id"
              data={ledger.data.pages.flatMap((p) => p.items)}
              columns={columns}
              pagination={false}
              empty={t('empty')}
            />
            {ledger.hasNextPage ? (
              <Button
                loading={ledger.isFetchingNextPage}
                onClick={() => void ledger.fetchNextPage()}
              >
                {t('more')}
              </Button>
            ) : null}
          </>
        )}
      </section>
      <DirectorRevenueHistory query={history} />
    </div>
  );
}
