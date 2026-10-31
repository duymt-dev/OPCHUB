'use client';

import { AdminTable, ErrorState, PageSkeleton } from '@opchub/ui';
import { Button } from 'antd';
import { useTranslations } from 'next-intl';
import type { RevenueDetailProps } from '../revenue-types';
import { useRevenueDetail } from '../hooks/use-revenue-sharing';
import { useRevenueLedgerColumns } from './revenue-ledger-columns';
import { DirectorRevenueHistory } from './director-revenue-history';
import styles from './revenue-sharing.module.css';

export function DirectorRevenueDetail({ directorId, receiptCount }: RevenueDetailProps) {
  const t = useTranslations('revenue');
  const { ledger, history } = useRevenueDetail(directorId);
  const columns = useRevenueLedgerColumns();
  const rows = ledger.data?.pages.flatMap((p) => p.items) ?? [];
  const remaining = BigInt(receiptCount) - BigInt(rows.length);
  const moreLabel = remaining > 0n ? t('moreReceipts', { count: remaining.toString() }) : t('more');
  return (
    <div className={styles.detail}>
      <section className={styles.ledger} aria-label={t('ledger')}>
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
              data={rows}
              columns={columns}
              pagination={false}
              empty={t('empty')}
            />
            {ledger.hasNextPage ? (
              <Button
                type="text"
                size="small"
                className={styles.ledgerMore ?? ''}
                aria-label={moreLabel}
                aria-busy={ledger.isFetchingNextPage}
                loading={ledger.isFetchingNextPage}
                onClick={() => void ledger.fetchNextPage()}
              >
                {moreLabel}
              </Button>
            ) : null}
          </>
        )}
      </section>
      <DirectorRevenueHistory query={history} />
    </div>
  );
}
