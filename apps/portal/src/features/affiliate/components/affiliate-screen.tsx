'use client';

import { ErrorState, PageSkeleton, Tabs } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useAffiliate, useAffiliateHistory } from '../hooks/use-affiliate';
import { useBankForm } from '../hooks/use-bank-form';
import { useAffiliateTheme } from '../theme';
import type { ActiveAffiliate } from '../types';
import { AffiliateHero, AffiliateLocked } from './affiliate-hero';
import { AffiliateStats } from './affiliate-stats';
import { AffiliateHeader } from './affiliate-header';
import { BankWarning } from './bank-account-card';
import { ReferralsTab, PayoutsTab } from './history-tabs';
import styles from './affiliate.module.css';

function ActiveScreen({ data }: { data: ActiveAffiliate }) {
  const t = useTranslations('affiliate');
  const bank = useBankForm();
  const h = useAffiliateHistory();
  return (
    <>
      {data.state === 'paused' ? (
        <div role="status" className={styles.warning}>
          {t('paused')}
        </div>
      ) : null}
      {!data.bank ? <BankWarning onEdit={() => bank.edit(null)} /> : null}
      <AffiliateHero data={data} bank={bank} />
      <AffiliateStats stats={data.stats} />
      <div className={styles.tabs}>
        <Tabs
          ariaLabel={t('title')}
          idPrefix="affiliate"
          activeKey={h.params.tab}
          onChange={(tab) => h.update({ tab, page: 1 })}
          items={[
            { key: 'ref', label: <span>{t('tabs.ref')}</span>, count: h.allRefs.data?.total ?? 0 },
            {
              key: 'hist',
              label: <span>{t('tabs.hist')}</span>,
              count: h.payouts.data?.total ?? 0,
            },
          ]}
        />
      </div>
      <section
        role="tabpanel"
        id={`affiliate-panel-${h.params.tab}`}
        aria-labelledby={`affiliate-tab-${h.params.tab}`}
      >
        {h.params.tab === 'ref' ? (
          <ReferralsTab history={h} />
        ) : (
          <PayoutsTab history={h} received={data.stats.received} />
        )}
      </section>
    </>
  );
}

/** Page orchestration only; forms, lists and server state belong to their own modules. */
export function AffiliateScreen() {
  const q = useAffiliate();
  const t = useTranslations('common.state');
  const tokens = useAffiliateTheme();
  if (q.isPending) return <PageSkeleton />;
  if (q.isError)
    return (
      <ErrorState title={t('error')} retryLabel={t('retry')} onRetry={() => void q.refetch()} />
    );
  return (
    <div className={styles.screen} style={tokens}>
      <AffiliateHeader />
      {q.data.state === 'locked' ? (
        <AffiliateLocked policy={q.data.policy} />
      ) : (
        <ActiveScreen data={q.data} />
      )}
    </div>
  );
}
