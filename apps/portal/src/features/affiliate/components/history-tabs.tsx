'use client';

import {
  AdminTable,
  EmptyState,
  ErrorState,
  PageSkeleton,
  Pagination,
  StatusTag,
} from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { formatDate, formatVnd } from '@/features/membership';
import type { useAffiliateHistory } from '../hooks/use-affiliate';
import { AFFILIATE_PAGE_SIZE, endOfMonth, monthLabel } from '../model';
import { usePayoutColumns, useReferralColumns } from './history-columns';
import { PayoutCards, ReferralCards } from './history-mobile';
import styles from './history.module.css';

type History = ReturnType<typeof useAffiliateHistory>;

function HistoryPager({ h, total, unit }: { h: History; total: number; unit: string }) {
  return total > 0 ? (
    <Pagination
      page={h.params.page}
      size={AFFILIATE_PAGE_SIZE}
      total={total}
      onChange={(page) => h.update({ page })}
      labels={{ unit }}
    />
  ) : null;
}

export function ReferralsTab({ history: h }: { history: History }) {
  const t = useTranslations('affiliate');
  const common = useTranslations('common.state');
  const columns = useReferralColumns();
  const q = h.refs;
  if (q.isPending) return <PageSkeleton blocks={1} />;
  if (q.isError)
    return (
      <ErrorState
        title={common('error')}
        retryLabel={common('retry')}
        onRetry={() => void q.refetch()}
      />
    );
  const data = q.data;
  const summary = data.summary;
  const months = [...new Set([h.month, ...data.months])].sort().reverse();
  const state = !summary.count ? 'empty' : summary.status === 'paid' ? 'paid' : 'waiting';
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <h3>{t('referrals.title')}</h3>
          <p>{t('referrals.description')}</p>
        </div>
        <select
          aria-label={t('month', { month: monthLabel(h.month) })}
          value={h.month}
          onChange={(e) => h.update({ month: e.target.value, page: 1 })}
        >
          {months.map((m) => (
            <option key={m} value={m}>
              {t('month', { month: monthLabel(m) })}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.summary}>
        <b>{t('month', { month: monthLabel(h.month) })}</b>
        <span>{t('referrals.customers', { count: summary.count })}</span>
        <span>
          {t('referrals.commission')} <b className={styles.blue}>{formatVnd(summary.commission)}</b>
        </span>
        <span className={styles.summaryStatus}>
          <StatusTag tone={state === 'paid' ? 'green' : state === 'waiting' ? 'amber' : 'neutral'}>
            {t(`referrals.summary.${state}`, { date: formatDate(endOfMonth(h.month)) })}
          </StatusTag>
        </span>
      </div>
      <div className={styles.table}>
        <AdminTable
          rowKey="id"
          columns={columns}
          data={data.items}
          loading={q.isFetching}
          empty={<EmptyState title={t('referrals.empty')} description={t('referrals.emptyHint')} />}
        />
      </div>
      <ReferralCards rows={data.items} />
      <HistoryPager h={h} total={data.total} unit={t('referrals.unit')} />
    </div>
  );
}

export function PayoutsTab({ history: h, received }: { history: History; received: number }) {
  const t = useTranslations('affiliate');
  const common = useTranslations('common.state');
  const columns = usePayoutColumns();
  const q = h.payouts;
  if (q.isPending) return <PageSkeleton blocks={1} />;
  if (q.isError)
    return (
      <ErrorState
        title={common('error')}
        retryLabel={common('retry')}
        onRetry={() => void q.refetch()}
      />
    );
  const rows = q.data.items.map((r) => ({
    ...r,
    key: `${r.monthKey}:${r.paidAt}:${r.bank.bankNo}`,
  }));
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <h3>{t('tabs.hist')}</h3>
          <p>{t('payouts.description')}</p>
        </div>
        <div className={styles.total}>
          <small>{t('payouts.total', { count: q.data.total })}</small>
          <b>{formatVnd(received)}</b>
        </div>
      </div>
      {rows.length ? (
        <div className={styles.table}>
          <AdminTable rowKey="key" columns={columns} data={rows} loading={q.isFetching} />
        </div>
      ) : (
        <div className={styles.empty}>
          <EmptyState title={t('payouts.empty')} />
        </div>
      )}
      <PayoutCards rows={q.data.items} />
      <HistoryPager h={h} total={q.data.total} unit={t('payouts.unit')} />
    </div>
  );
}
