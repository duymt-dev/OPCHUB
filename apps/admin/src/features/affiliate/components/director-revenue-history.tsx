'use client';

import { ErrorState, PageSkeleton } from '@opchub/ui';
import { Button } from 'antd';
import { useTranslations } from 'next-intl';
import type { useRevenueDetail } from '../hooks/use-revenue-sharing';
import { revenueDate, revenueMoney } from '../revenue-presentation';
import { affiliateMonthLabel } from '../model';
import styles from './revenue-sharing.module.css';

export function DirectorRevenueHistory({
  query,
}: {
  query: ReturnType<typeof useRevenueDetail>['history'];
}) {
  const t = useTranslations('revenue');
  if (query.isPending) return <PageSkeleton />;
  if (query.isError)
    return (
      <ErrorState title={t('error')} retryLabel={t('retry')} onRetry={() => void query.refetch()} />
    );
  const rows = query.data.pages.flatMap((p) => p.items);
  return (
    <section className={styles.history} aria-label={t('history')}>
      <b>{t('history')}</b>
      {!rows.length ? <small>{t('noHistory')}</small> : null}
      {rows.map((r) => (
        <div key={r.id}>
          <span>
            {t('payoutHistoryRow', {
              month: affiliateMonthLabel(r.monthKey),
              date: revenueDate(r.paidAt),
            })}
          </span>
          <small>
            {t('receiptBank', {
              holder: r.bank.bankHolder,
              bank: r.bank.bankName,
              account: r.bank.bankNo,
            })}
          </small>
          <b className={styles.paid}>{revenueMoney(r.amount)}</b>
        </div>
      ))}
      {query.hasNextPage ? (
        <Button loading={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
          {t('more')}
        </Button>
      ) : null}
    </section>
  );
}
