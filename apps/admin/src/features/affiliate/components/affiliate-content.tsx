'use client';

import { ErrorState, PageSkeleton } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import type { useAffiliateQueries } from '../hooks/use-affiliate-queries';
import type { AffiliateParams } from '../types';
import { AffiliateTable } from './affiliate-table';
import { CommissionTable } from './commission-table';
import { PolicyForm } from './policy-form';
import { RegionalDirectorConfig } from './regional-director-config';
import styles from './affiliate.module.css';
import policyLayout from './policy-layout.module.css';

interface Props {
  params: AffiliateParams;
  update: (patch: Partial<AffiliateParams>) => void;
  queries: ReturnType<typeof useAffiliateQueries>;
  header: ReactNode;
  toolbar: ReactNode;
}

export function AffiliateContent({ params, update, queries, header, toolbar }: Props) {
  const t = useTranslations('affiliate');
  if (params.tab === 'gcfg')
    return (
      <div className={`${styles.card} ${policyLayout.panel}`}>
        {header}
        <RegionalDirectorConfig />
      </div>
    );
  const current =
    params.tab === 'com'
      ? queries.commissions
      : params.tab === 'aff'
        ? queries.agents
        : queries.policy;
  if (current.isError)
    return (
      <div className={styles.card}>
        {header}
        {params.tab !== 'cfg' ? toolbar : null}
        <ErrorState
          title={t('error')}
          retryLabel={t('retry')}
          onRetry={() => void current.refetch()}
        />
      </div>
    );
  if (params.tab === 'cfg')
    return (
      <div className={`${styles.card} ${policyLayout.panel}`}>
        {header}
        {queries.policy.data ? (
          <PolicyForm key={JSON.stringify(queries.policy.data)} value={queries.policy.data} />
        ) : (
          <PageSkeleton />
        )}
      </div>
    );
  const shared = { params, update, header, toolbar };
  return params.tab === 'com' ? (
    <CommissionTable
      {...shared}
      rows={queries.commissions.data?.items ?? []}
      total={queries.commissions.data?.total ?? 0}
      loading={queries.commissions.isPending || queries.commissions.isPlaceholderData}
    />
  ) : (
    <AffiliateTable
      {...shared}
      rows={queries.agents.data?.items ?? []}
      total={queries.agents.data?.total ?? 0}
      loading={queries.agents.isPending || queries.agents.isPlaceholderData}
    />
  );
}
