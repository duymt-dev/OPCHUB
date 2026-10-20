'use client';

import { useTranslations } from 'next-intl';
import { ErrorState } from '@opchub/ui';
import type { UseQueryResult } from '@tanstack/react-query';
import { affiliateMoney } from '../format';
import type { AffiliateSummary } from '../types';
import styles from './affiliate.module.css';

export function StatCards({ items }: { items: { label: string; value: string; hint?: string }[] }) {
  return (
    <div className={styles.stats}>
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

export function AffiliateStats({ summary }: { summary: AffiliateSummary | undefined }) {
  const t = useTranslations('affiliate.stats');
  return (
    <StatCards
      items={(['revenue', 'totalCommission', 'payable', 'paid'] as const).map((key) => ({
        label: t(key),
        value: summary ? affiliateMoney(summary[key]) : '—',
        ...(key === 'payable' ? { hint: t('payableHint') } : {}),
      }))}
    />
  );
}

export function AffiliateSummaryState({ query }: { query: UseQueryResult<AffiliateSummary> }) {
  const t = useTranslations('affiliate');
  return query.isError ? (
    <ErrorState title={t('error')} retryLabel={t('retry')} onRetry={() => void query.refetch()} />
  ) : (
    <AffiliateStats summary={query.data} />
  );
}
