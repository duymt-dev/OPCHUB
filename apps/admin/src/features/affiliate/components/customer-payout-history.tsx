'use client';

import { useLocale, useTranslations } from 'next-intl';
import { affiliateBankNo, affiliateHistoryDate, affiliateMoney } from '../format';
import { affiliateMonthLabel } from '../model';
import type { AffiliateCustomerHistoryProps } from '../types';
import shared from './affiliate.module.css';
import styles from './customer-layout.module.css';

/** Display the immutable receipt supplied by the API, never the agent's live bank. */
export function CustomerPayoutHistory({ row }: AffiliateCustomerHistoryProps) {
  const locale = useLocale();
  const t = useTranslations('affiliate');
  const time = Date.parse(row.date);
  const month = Number.isFinite(time)
    ? affiliateMonthLabel(new Date(time + 7 * 3_600_000).toISOString().slice(0, 7), locale)
    : '—';
  if (row.status === 'paid')
    return (
      <div className={styles.history}>
        <span>
          <b className={styles.money}>{affiliateMoney(row.commission, locale)}</b> ·{' '}
          {affiliateHistoryDate(row.paidAt, locale)}
        </span>
        <span className={shared.hint}>
          {row.bank ? (
            <>
              {row.bank.bankHolder} · {row.bank.bankName} · {affiliateBankNo(row.bank.bankNo)} ·{' '}
              {t('historyPeriod', { month })}
            </>
          ) : (
            '—'
          )}
        </span>
      </div>
    );
  if (row.status === 'cancelled')
    return <span className={shared.hint}>{t('cancelledPayout')}</span>;
  if (row.status !== 'recorded') return <span>—</span>;
  return <span className={shared.hint}>{t('pendingPayout', { month })}</span>;
}
