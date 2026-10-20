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

export function AffiliateDetailHead({ agent }: { agent: AffiliateDetail }) {
  const t = useTranslations('affiliate');
  const access = useAffiliateAccess();
  const [editing, setEditing] = useState(false);
  return (
    <>
      <Link data-ro-ok href="/affiliate?tab=aff">
        ← {t('back')}
      </Link>
      <div className={styles.card}>
        <div className={styles.head}>
          <div className={styles.stack}>
            <h2>{agent.name}</h2>
            <span className={styles.hint}>
              {agent.email} · {agent.code}
            </span>
          </div>
          <CommissionStatus status={agent.status} />
        </div>
        <div className={styles.actions}>
          <b>
            {t('rateLabel')} · {agent.rate}%
          </b>
          <span className={styles.hint}>{t('rateHint')}</span>
          <Button
            onClick={() => {
              if (access.guard('affiliate.action')) setEditing(true);
            }}
          >
            {t('editRate')}
          </Button>
        </div>
        <div className={styles.stack}>
          <b>{t('bank')}</b>
          {agent.bank ? (
            <span>
              {agent.bank.bankHolder} · {agent.bank.bankName} · {agent.bank.bankNo}
            </span>
          ) : (
            <span className={styles.warning}>{t('noBank')}</span>
          )}
        </div>
      </div>
      <StatCards
        items={[
          { label: t('stats.customers'), value: String(agent.stats.customers) },
          { label: t('stats.broughtRevenue'), value: affiliateMoney(agent.stats.revenue) },
          { label: t('stats.commission'), value: affiliateMoney(agent.stats.commission) },
          { label: t('stats.paid'), value: affiliateMoney(agent.stats.paid) },
        ]}
      />
      {editing ? (
        <RateDialog ids={[agent.id]} initialRate={agent.rate} onClose={() => setEditing(false)} />
      ) : null}
    </>
  );
}
