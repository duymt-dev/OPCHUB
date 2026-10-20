'use client';

import { Button } from 'antd';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { affiliateMoney } from '../format';
import { useAffiliateAccess } from '../hooks/use-affiliate-access';
import { AffiliateIdentity, type AffiliateIdentityProps } from './affiliate-identity';
import { StatCards } from './affiliate-stats';
import { RateDialog } from './rate-dialog';
import styles from './affiliate.module.css';
import layout from './affiliate-detail.module.css';

export function AffiliateDetailHead({ agent, cookieDays }: AffiliateIdentityProps) {
  const t = useTranslations('affiliate');
  const access = useAffiliateAccess();
  const [editing, setEditing] = useState(false);
  return (
    <>
      <AffiliateIdentity agent={agent} cookieDays={cookieDays} />
      <StatCards
        className={layout.stats}
        items={[
          { label: t('stats.customers'), value: String(agent.stats.customers) },
          { label: t('stats.broughtRevenue'), value: affiliateMoney(agent.stats.revenue) },
          { label: t('stats.commission'), value: affiliateMoney(agent.stats.commission) },
          { label: t('stats.paid'), value: affiliateMoney(agent.stats.paid) },
        ]}
      />
      <div className={layout.rate}>
        <div className={layout.rateLabel}>
          <span>{t('rateSummaryLabel')}</span>
          <span className={styles.hint}>{t('rateHint')}</span>
        </div>
        <b className={layout.rateValue}>{agent.rate}%</b>
        <Button
          type="link"
          onClick={() => {
            if (access.guard('affiliate.action')) setEditing(true);
          }}
        >
          {t('editRate')}
        </Button>
      </div>
      {editing ? (
        <RateDialog ids={[agent.id]} initialRate={agent.rate} onClose={() => setEditing(false)} />
      ) : null}
    </>
  );
}
