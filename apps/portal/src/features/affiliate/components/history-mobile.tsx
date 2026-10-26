'use client';

import type { AffiliatePayouts } from '@opchub/shared/api-domains';
import { EmptyState, StatusTag } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { formatDate, formatVnd } from '@/features/membership';
import { monthLabel } from '../model';
import type { ReferralRow } from '../types';
import { referralTone } from './history-columns';
import styles from './history.module.css';

export function ReferralCards({ rows }: { rows: ReferralRow[] }) {
  const t = useTranslations('affiliate.referrals');
  return (
    <div className={styles.mobile}>
      {rows.length ? (
        rows.map((r) => (
          <article key={r.id} className={styles.mobileCard}>
            <b>{r.name}</b>
            <span className={styles.mobilePlan}>{r.plan}</span>
            <div className={styles.mobilePair}>
              <span aria-label={t('columns.date')}>{formatDate(r.date)}</span>
              <span aria-label={t('columns.fee')}>
                {r.status === 'pending' ? '—' : formatVnd(r.feeAmount)}
              </span>
            </div>
            <b className={styles.mobileAmount} aria-label={t('columns.commission')}>
              {r.status === 'pending' ? '—' : formatVnd(r.commission)}
            </b>
            <div className={styles.mobileStatus} title={r.cancelReason ?? undefined}>
              <StatusTag lineHeight={22} tone={referralTone(r.status)}>
                {t(`status.${r.status}`)}
              </StatusTag>
              {r.cancelReason ? (
                <span className={styles.mobileReason}>{r.cancelReason}</span>
              ) : null}
            </div>
          </article>
        ))
      ) : (
        <EmptyState title={t('empty')} description={t('emptyHint')} />
      )}
    </div>
  );
}

export function PayoutCards({ rows }: { rows: AffiliatePayouts['items'] }) {
  const t = useTranslations('affiliate');
  if (!rows.length) return null;
  return (
    <div className={styles.mobile}>
      {rows.map((r) => (
        <article key={`${r.monthKey}:${r.paidAt}:${r.bank.bankNo}`} className={styles.mobileCard}>
          <b>{t('month', { month: monthLabel(r.monthKey) })}</b>
          <span aria-label={t('payouts.columns.date')}>{formatDate(r.paidAt)}</span>
          {/* Prototype v4: chủ TK và ngân hàng cùng hàng trong thẻ */}
          <div className={styles.mobilePair}>
            <b>{r.bank.bankHolder}</b>
            <span className={styles.mobilePlan}>
              {r.bank.bankName} · {r.bank.bankNo}
            </span>
          </div>
          <b className={styles.mobileAmount}>{formatVnd(r.amount)}</b>
          <div className={styles.mobileStatus}>
            <StatusTag lineHeight={22} tone="green">
              {t('payouts.paid')}
            </StatusTag>
          </div>
        </article>
      ))}
    </div>
  );
}
