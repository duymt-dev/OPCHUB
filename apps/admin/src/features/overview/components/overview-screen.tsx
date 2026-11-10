'use client';

import { PageHeader } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useOverview } from '../hooks/use-overview';
import { OverviewRangeControl } from './overview-range-control';
import { GrowthChart } from './growth-chart';
import { ConversionTable } from './conversion-table';
import styles from './overview.module.css';
import { StatCards } from './stat-cards';
import { SystemFlow } from './system-flow';

/** D-01 Tổng quan v4: Luồng hệ thống + 4 thẻ số + tăng trưởng (D-89) */
export function OverviewScreen() {
  const t = useTranslations('overview');
  const query = useOverview();
  const { data } = query;
  const status = useTranslations('common.state');
  return (
    <>
      <PageHeader
        title={t('title')}
        subtitle={t('sub')}
        extra={<OverviewRangeControl range={data?.range} />}
      />
      {query.isPending ? <div role="status">{status('loading')}</div> : null}
      {query.isError ? (
        <div role="alert">
          {status('error')}{' '}
          <button type="button" onClick={() => void query.refetch()}>
            {status('retry')}
          </button>
        </div>
      ) : null}
      <div className={styles.wrap} aria-busy={query.isFetching}>
        {data ? (
          <>
            <SystemFlow />
            <StatCards />
          </>
        ) : null}
        <GrowthChart />
        <ConversionTable />
      </div>
    </>
  );
}
