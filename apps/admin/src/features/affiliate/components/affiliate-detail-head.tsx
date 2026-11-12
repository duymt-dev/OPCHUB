'use client';

import { useLocale, useTranslations } from 'next-intl';
import { affiliateMoney } from '../format';
import { AffiliateIdentity, type AffiliateIdentityProps } from './affiliate-identity';
import { StatCards } from './affiliate-stats';
import { AffiliateRateEditor } from './affiliate-rate-editor';
import styles from './affiliate.module.css';
import layout from './affiliate-detail.module.css';

export function AffiliateDetailHead({ agent, cookieDays }: AffiliateIdentityProps) {
  const locale = useLocale();
  const t = useTranslations('affiliate');
  return (
    <>
      <AffiliateIdentity agent={agent} cookieDays={cookieDays} />
      <StatCards
        className={layout.stats}
        items={[
          { label: t('stats.customers'), value: String(agent.stats.customers) },
          { label: t('stats.broughtRevenue'), value: affiliateMoney(agent.stats.revenue, locale) },
          { label: t('stats.commission'), value: affiliateMoney(agent.stats.commission, locale) },
          { label: t('stats.paid'), value: affiliateMoney(agent.stats.paid, locale) },
        ]}
      />
      <div className={layout.rate}>
        <div className={layout.rateLabel}>
          <span>{t('rateSummaryLabel')}</span>
          <span className={styles.hint}>{t('rateHint')}</span>
        </div>
        <AffiliateRateEditor id={agent.id} rate={agent.rate} />
      </div>
    </>
  );
}
