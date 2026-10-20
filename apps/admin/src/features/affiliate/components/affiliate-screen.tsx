'use client';

import { PageHeader } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useUrlParams } from '@/lib/use-url-params';
import { useAffiliateQueries } from '../hooks/use-affiliate-queries';
import { useAffiliateAccess } from '../hooks/use-affiliate-access';
import { useAffiliatePage } from '../hooks/use-affiliate-page';
import { affiliateParamsSchema } from '../model';
import type { AffiliateParams } from '../types';
import { AffiliateSummaryState } from './affiliate-stats';
import { AffiliateContent } from './affiliate-content';
import { AffiliateTabs } from './affiliate-tabs';
import { ListToolbar } from './list-toolbar';
import styles from './affiliate.module.css';

export function AffiliateScreen() {
  const t = useTranslations('affiliate');
  const { params, update } = useUrlParams<AffiliateParams>(affiliateParamsSchema);
  const queries = useAffiliateQueries(params);
  const list = params.tab === 'com' ? queries.commissions : queries.agents;
  useAffiliatePage(
    params,
    params.tab === 'cfg' || list.isPlaceholderData ? undefined : list.data,
    update,
  );
  const access = useAffiliateAccess();
  if (!access.view) return null; // AdminShell owns the common 403 panel.
  const header = (
    <AffiliateTabs
      tab={params.tab}
      counts={queries.counts}
      net={queries.summary.data?.netRevenue}
      onTab={(tab) => update({ tab, q: '', status: 'all', page: 1 })}
    />
  );
  const toolbar = <ListToolbar params={params} update={update} counts={queries.counts.statuses} />;
  return (
    <>
      <div className={styles.pageHeader}>
        <PageHeader title={t('title')} subtitle=" " />
      </div>
      <div className={styles.wrap}>
        <AffiliateSummaryState query={queries.summary} customers={queries.counts.customers} />
        <AffiliateContent
          params={params}
          update={update}
          queries={queries}
          header={header}
          toolbar={toolbar}
        />
      </div>
    </>
  );
}
