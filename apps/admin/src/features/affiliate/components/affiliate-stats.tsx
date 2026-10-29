'use client';

import { useTranslations } from 'next-intl';
import { ErrorState } from '@opchub/ui';
import type { UseQueryResult } from '@tanstack/react-query';
import { affiliateMoney } from '../format';
import type { AffiliateSummary } from '../types';
import { affiliateCostRatio, affiliatePayoutCalendar } from '../summary-presentation';
import styles from './affiliate.module.css';

export function StatCards({
  items,
  className = '',
}: {
  items: { label: string; value: string; hint?: string }[];
  className?: string | undefined;
}) {
  return (
    <div className={`${styles.stats} ${className}`}>
      {items.map((item) => (
        <div className={styles.stat} key={item.label}>
          <span className={styles.statLabel}>{item.label}</span>
          <b className={styles.statValue}>{item.value}</b>
          {item.hint ? <span className={styles.hint}>{item.hint}</span> : null}
        </div>
      ))}
    </div>
  );
}

export function AffiliateStats({
  summary,
  customers,
}: {
  summary: AffiliateSummary | undefined;
  customers?: number | undefined;
}) {
  const t = useTranslations('affiliate.stats');
  const ratio = summary ? affiliateCostRatio(summary.totalCommission, summary.revenue) : undefined;
  const hints = {
    // BR-AFF-REV (v4.2): "{n} Gói DN · {n} Gói Cá nhân · {n} Gói Gọi vốn"; trang chi tiết đại lý giữ số khách
    revenue:
      customers !== undefined
        ? t('convertedHint', { count: customers })
        : summary
          ? t('plansHint', summary.plans)
          : undefined,
    totalCommission: ratio === undefined ? undefined : t('costHint', { ratio }),
    payable: t('payableHint'),
    paid: summary ? t('nextPayoutHint', { date: affiliatePayoutCalendar() }) : undefined,
  };
  return (
    <StatCards
      items={(['revenue', 'totalCommission', 'payable', 'paid'] as const).map((key) => {
        const hint = hints[key];
        return {
          label: t(key),
          value: summary ? affiliateMoney(summary[key]) : '—',
          ...(hint ? { hint } : {}),
        };
      })}
    />
  );
}

export function AffiliateSummaryState({
  query,
  customers,
}: {
  query: UseQueryResult<AffiliateSummary>;
  customers?: number | undefined;
}) {
  const t = useTranslations('affiliate');
  return query.isError ? (
    <ErrorState title={t('error')} retryLabel={t('retry')} onRetry={() => void query.refetch()} />
  ) : (
    <AffiliateStats summary={query.data} customers={customers} />
  );
}
