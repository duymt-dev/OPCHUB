'use client';

import { ErrorState, PageHeader, PageSkeleton } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useUrlParams } from '@/lib/use-url-params';
import { useAffiliateDetail } from '../hooks/use-affiliate-detail';
import { useAffiliateAccess } from '../hooks/use-affiliate-access';
import { useAffiliatePage } from '../hooks/use-affiliate-page';
import { affiliateDetailParamsSchema } from '../model';
import type { AffiliateDetailParams } from '../types';
import { AffiliateDetailHead } from './affiliate-detail-head';
import { AffiliateDetailTabs } from './affiliate-detail-tabs';
import { CustomersTable } from './customers-table';
import { PayoutMonthsTable } from './payout-months-table';
import styles from './affiliate.module.css';
import layout from './affiliate-detail.module.css';

export function AffiliateDetailScreen({ id }: { id: string }) {
  const t = useTranslations('affiliate');
  const access = useAffiliateAccess();
  const { params, update } = useUrlParams<AffiliateDetailParams>(affiliateDetailParamsSchema);
  const { detail, months, customers, policy, customerCount } = useAffiliateDetail(id, params);
  const current = params.tab === 'months' ? months : customers;
  useAffiliatePage(params, current.isPlaceholderData ? undefined : current.data, update);
  if (!access.view) return null;
  if (detail.isError)
    return (
      <ErrorState
        title={t('error')}
        retryLabel={t('retry')}
        onRetry={() => void detail.refetch()}
      />
    );
  if (!detail.data) return <PageSkeleton />;
  const header = (
    <AffiliateDetailTabs tab={params.tab} customers={customerCount.data} update={update} />
  );
  return (
    <>
      <div className={styles.pageHeader}>
        <PageHeader title={t('title')} subtitle=" " />
      </div>
      <div className={layout.detail}>
        <AffiliateDetailHead agent={detail.data} cookieDays={policy.data?.cookieDays} />
        {current.isError ? (
          <div className={styles.card}>
            {header}
            <ErrorState
              title={t('error')}
              retryLabel={t('retry')}
              onRetry={() => void current.refetch()}
            />
          </div>
        ) : params.tab === 'months' ? (
          <PayoutMonthsTable
            agent={detail.data}
            rows={months.data?.items ?? []}
            total={months.data?.total ?? 0}
            params={params}
            update={update}
            header={header}
            loading={months.isPending || months.isPlaceholderData}
          />
        ) : (
          <CustomersTable
            rows={customers.data?.items ?? []}
            total={customers.data?.total ?? 0}
            params={params}
            update={update}
            header={header}
            loading={customers.isPending || customers.isPlaceholderData}
          />
        )}
      </div>
    </>
  );
}
