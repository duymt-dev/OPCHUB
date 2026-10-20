'use client';

import { Button } from 'antd';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState } from 'react';
import { affiliateMoney } from '../format';
import { useAffiliateAccess } from '../hooks/use-affiliate-access';
import type { AffiliateDetail } from '../types';
import { CommissionStatus } from './commission-status';
import { StatCards } from './affiliate-stats';
import { RateDialog } from './rate-dialog';
import styles from './affiliate.module.css';
import layout from './affiliate-detail.module.css';

export function AffiliateDetailHead({ agent }: { agent: AffiliateDetail }) {
  const t = useTranslations('affiliate');
  const access = useAffiliateAccess();
  const [editing, setEditing] = useState(false);
  return (
    <>
      <div className={layout.header}>
        <nav className={layout.breadcrumb} aria-label={t('title')}>
          <Link data-ro-ok href="/affiliate?tab=aff">
            ‹ {t('title')}
          </Link>
          <span>/</span>
          <span>{agent.name}</span>
        </nav>
        <div className={layout.heading}>
          <div className={layout.identity}>
            <h2>{agent.name}</h2>
            <span className={styles.hint}>
              {t('columns.code')} {agent.code} · {agent.email}
            </span>
            {agent.bank ? (
              <span aria-label={t('bank')}>
                {agent.bank.bankHolder} · {agent.bank.bankName} · {agent.bank.bankNo}
              </span>
            ) : (
              <span className={styles.warning}>{t('noBank')}</span>
            )}
            {agent.status === 'paused' ? <CommissionStatus status={agent.status} /> : null}
          </div>
          <Link data-ro-ok className={layout.back} href="/affiliate?tab=aff">
            ← {t('back')}
          </Link>
        </div>
      </div>
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
          <span>{t('rateLabel')}</span>
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
