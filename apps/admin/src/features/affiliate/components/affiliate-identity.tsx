'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { affiliateBankNo } from '../format';
import type { AffiliateDetail } from '../types';
import { CommissionStatus } from './commission-status';
import styles from './affiliate.module.css';
import layout from './affiliate-detail.module.css';

export interface AffiliateIdentityProps {
  agent: AffiliateDetail;
  cookieDays?: number | undefined;
}

/** Identity metadata uses current policy; missing policy must never become a fake 30 days. */
export function AffiliateIdentity({ agent, cookieDays }: AffiliateIdentityProps) {
  const t = useTranslations('affiliate');
  return (
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
            {cookieDays !== undefined ? ` · ${t('attributionDays', { days: cookieDays })}` : ''}
          </span>
          {agent.bank ? (
            <span aria-label={t('bank')}>
              {agent.bank.bankHolder} · {agent.bank.bankName} · {affiliateBankNo(agent.bank.bankNo)}
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
  );
}
