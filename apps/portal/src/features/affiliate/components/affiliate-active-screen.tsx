'use client';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/lib/auth-store';
import { useAffiliateHistory } from '../hooks/use-affiliate';
import { useMyRegion } from '../hooks/use-my-region';
import { useBankForm } from '../hooks/use-bank-form';
import type { ActiveAffiliate } from '../types';
import { AffiliateHero } from './affiliate-hero';
import { AffiliateStats } from './affiliate-stats';
import { AffiliateHistorySection } from './affiliate-history-section';
import { RegionalBanner } from './regional-banner';
import { BankWarning } from './bank-account-card';
import styles from './affiliate.module.css';

export function AffiliateActiveScreen({ data }: { data: ActiveAffiliate }) {
  const t = useTranslations('affiliate');
  const name = useAuthStore((s) => s.me?.fullName ?? '');
  const bank = useBankForm();
  const h = useAffiliateHistory();
  const query = useMyRegion();
  const {
    update,
    params: { tab },
  } = h;
  const region = !query.isError && query.data?.state === 'director' ? query.data : null;
  useEffect(() => {
    if (!query.isPending && !region && tab === 'reg') update({ tab: 'ref', page: 1 });
  }, [query.isPending, region, tab, update]);
  const openRegion = () => {
    h.update({ tab: 'reg', page: 1 });
    document
      .getElementById('affiliate-history-tabs')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return (
    <>
      {data.state === 'paused' ? (
        <div role="status" className={styles.warning}>
          {t('paused')}
        </div>
      ) : null}
      {region ? <RegionalBanner region={region} name={name} onOpen={openRegion} /> : null}
      {!data.bank ? <BankWarning onEdit={() => bank.edit(null)} /> : null}
      <AffiliateHero data={data} bank={bank} />
      <AffiliateStats stats={data.stats} />
      <AffiliateHistorySection
        history={h}
        region={region}
        name={name}
        received={data.stats.received}
      />
    </>
  );
}
