'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ErrorState, PageSkeleton } from '@opchub/ui';
import { useRegionalShares } from '../hooks/use-regional-shares';
import { RegionalShareKpis } from './regional-share-kpis';
import { RegionalShareToolbar } from './regional-share-toolbar';
import { RegionalShareRow } from './regional-share-row';
import styles from './regional-share.module.css';
export function RegionalList() {
  const t = useTranslations('affiliate.regional.share');
  const [q, setQ] = useState('');
  const query = useRegionalShares(q);
  if (query.isError)
    return (
      <ErrorState title={t('error')} retryLabel={t('retry')} onRetry={() => void query.refetch()} />
    );
  if (!query.data) return <PageSkeleton />;
  return (
    <div className={styles.panel}>
      <RegionalShareKpis kpi={query.data.kpi} />
      <RegionalShareToolbar
        q={q}
        onQ={setQ}
        rule={query.data.rule}
        payoutDate={query.data.kpi.payoutDate}
      />
      <div className={styles.scroll}>
        <div className={styles.table} role="table" aria-label={t('table')}>
          <div className={`${styles.row} ${styles.header}`} role="row">
            {(
              [
                'director',
                'bank',
                'affiliates',
                'count',
                'total',
                'paid',
                'due',
                'actions',
              ] as const
            ).map((key) => (
              <div key={key} role="columnheader">
                {key === 'actions' ? '' : t(key)}
              </div>
            ))}
          </div>
          {query.data.rows.map((row) => (
            <RegionalShareRow key={row.region} row={row} />
          ))}
          {!query.data.rows.length && <p>{t('empty')}</p>}
        </div>
      </div>
    </div>
  );
}
