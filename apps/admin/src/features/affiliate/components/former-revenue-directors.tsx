'use client';

import { EmptyState, ErrorState, PageSkeleton } from '@opchub/ui';
import { Button } from 'antd';
import { useTranslations } from 'next-intl';
import type { FormerRevenueProps } from '../revenue-types';
import { RevenueSharingTable } from './revenue-sharing-table';
import styles from './revenue-sharing.module.css';

export function FormerRevenueDirectors({ query, onPay, canPay }: FormerRevenueProps) {
  const t = useTranslations('revenue');
  const rows = query.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <section className={styles.wrap} aria-label={t('former')}>
      <small>{t('formerNote')}</small>
      {query.isError ? (
        <ErrorState
          title={t('error')}
          retryLabel={t('retry')}
          onRetry={() => void query.refetch()}
        />
      ) : query.isPending ? (
        <PageSkeleton />
      ) : rows.length ? (
        <RevenueSharingTable rows={rows} canPay={canPay} onPay={onPay} />
      ) : (
        <EmptyState title={t('formerEmpty')} />
      )}
      {query.hasNextPage ? (
        <Button
          data-ro-ok
          loading={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {t('more')}
        </Button>
      ) : null}
    </section>
  );
}
