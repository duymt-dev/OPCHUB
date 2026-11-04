'use client';
import { PageSkeleton, Tabs } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import type { useAffiliateHistory } from '../hooks/use-affiliate';
import type { DirectorRegion } from '../types';
import { ReferralsTab, PayoutsTab } from './history-tabs';
import { MyRegionTab } from './my-region-tab';
import styles from './affiliate.module.css';

export function AffiliateHistorySection({
  history: h,
  region,
  name,
  received,
}: {
  history: ReturnType<typeof useAffiliateHistory>;
  region: DirectorRegion | null;
  name: string;
  received: number;
}) {
  const t = useTranslations('affiliate');
  return (
    <>
      <div className={styles.tabs} id="affiliate-history-tabs">
        <Tabs
          ariaLabel={t('title')}
          idPrefix="affiliate"
          activeKey={h.params.tab}
          onChange={(tab) => {
            if (tab === 'ref' || tab === 'hist' || tab === 'reg') h.update({ tab, page: 1 });
          }}
          items={[
            { key: 'ref', label: <span>{t('tabs.ref')}</span>, count: h.allRefs.data?.total ?? 0 },
            {
              key: 'hist',
              label: <span>{t('tabs.hist')}</span>,
              count: h.payouts.data?.total ?? 0,
            },
            ...(region
              ? [
                  {
                    key: 'reg',
                    label: (
                      <span>
                        {t('region.tab')} <small>{t('region.badge')}</small>
                      </span>
                    ),
                  },
                ]
              : []),
          ]}
        />
      </div>
      <section
        role="tabpanel"
        id={`affiliate-panel-${h.params.tab}`}
        aria-labelledby={`affiliate-tab-${h.params.tab}`}
      >
        {h.params.tab === 'reg' ? (
          region ? (
            <MyRegionTab data={region} name={name} />
          ) : (
            <PageSkeleton blocks={1} />
          )
        ) : h.params.tab === 'ref' ? (
          <ReferralsTab history={h} />
        ) : (
          <PayoutsTab history={h} received={received} />
        )}
      </section>
    </>
  );
}
