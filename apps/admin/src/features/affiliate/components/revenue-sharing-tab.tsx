'use client';

import type { RevenueDirector } from '@opchub/shared/api-domains';
import { ErrorState, PageSkeleton } from '@opchub/ui';
import { Button } from 'antd';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRevenueSharing } from '../hooks/use-revenue-sharing';

import { RevenueSharingTable } from './revenue-sharing-table';
import { DirectorRevenuePayout } from './director-revenue-payout';
import styles from './revenue-sharing.module.css';
import { RevenueSharingHeader } from './revenue-sharing-header';
import { FormerRevenueDirectors } from './former-revenue-directors';

export function RevenueSharingTab({
  query,
  onQuery,
}: {
  query: string;
  onQuery: (q: string) => void;
}) {
  const t = useTranslations('revenue');
  const [showFormer, setShowFormer] = useState(false);
  const [paying, setPaying] = useState<RevenueDirector | null>(null);
  const { dashboard, former, access } = useRevenueSharing(query);
  if (!access.view) return null;
  if (dashboard.isPending) return <PageSkeleton />;
  if (dashboard.isError)
    return (
      <ErrorState
        title={t('error')}
        retryLabel={t('retry')}
        onRetry={() => void dashboard.refetch()}
      />
    );
  const data = dashboard.data;
  const rows = data.items.filter((r) => data.visible.ids.includes(r.id));
  // Hide only a confirmed-empty optional section, never an error or earned history.
  const hasFormer = !former.isSuccess || former.data.pages.some((page) => page.items.length > 0);
  const pay = (row: RevenueDirector) => {
    if (access.guard('affiliate.payout')) setPaying(row);
  };
  return (
    <div className={styles.wrap} aria-busy={dashboard.isFetching}>
      <RevenueSharingHeader data={data} query={query} onQuery={onQuery} />
      {!access.payout ? <small>{t('readOnly')}</small> : null}
      <RevenueSharingTable
        rows={rows}
        canPay={access.payout && !dashboard.isPlaceholderData}
        onPay={pay}
      />
      {hasFormer || showFormer ? (
        <Button
          type="link"
          className={`${styles.formerToggle}`}
          aria-expanded={showFormer}
          onClick={() => setShowFormer(!showFormer)}
        >
          {t('former')}
        </Button>
      ) : null}
      {showFormer ? (
        <FormerRevenueDirectors query={former} onPay={pay} canPay={access.payout} />
      ) : null}
      {paying?.directorId ? (
        <DirectorRevenuePayout
          key={paying.directorId}
          row={paying}
          onClose={() => setPaying(null)}
        />
      ) : null}
    </div>
  );
}
