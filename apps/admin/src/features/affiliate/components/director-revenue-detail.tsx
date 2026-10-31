'use client';

import { AdminTable, ErrorState, PageSkeleton } from '@opchub/ui';
import { Button } from 'antd';
import { useTranslations } from 'next-intl';
import { useRevenueDetail } from '../hooks/use-revenue-sharing';
import { useRevenueLedgerColumns } from './revenue-ledger-columns';
import { DirectorRevenueHistory } from './director-revenue-history';
import styles from './revenue-sharing.module.css';

export function DirectorRevenueDetail({ directorId }: { directorId: string }) {
  const t = useTranslations('revenue');
  const { ledger, history } = useRevenueDetail(directorId);
  const columns = useRevenueLedgerColumns();
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
