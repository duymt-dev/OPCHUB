'use client';

import type { AffiliatePayouts } from '@opchub/shared/api-domains';
import { StatusTag, type AdminTableProps, type StatusTone } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { formatDate, formatVnd } from '@/features/membership';
import { monthLabel } from '../model';
import type { ReferralRow } from '../types';

const TONE: Record<ReferralRow['status'], StatusTone> = {
  pending: 'neutral',
  void: 'neutral',
  recorded: 'blue',
  paid: 'green',
  cancelled: 'rose',
};
export const referralTone = (status: ReferralRow['status']) => TONE[status];
export type PayoutRow = AffiliatePayouts['items'][number] & { key: string };

export function useReferralColumns(): AdminTableProps<ReferralRow>['columns'] {
  const t = useTranslations('affiliate.referrals');
  return [
    { title: t('columns.name'), dataIndex: 'name', width: 160, render: (v: string) => <b>{v}</b> },
    {
      title: t('columns.plan'),
      key: 'plan',
      width: 170,
      render: (_, r) => (
        <span>
          {r.status === 'pending' || r.status === 'void' ? t('pendingPlan') : r.plan}
          <small style={{ display: 'block' }}>
            {r.status !== 'pending' && r.status !== 'void'
              ? t(r.customerYear > 1 ? 'renewalYear' : 'year', { year: r.customerYear })
              : null}
          </small>
        </span>
      ),
    },
    {
      title: t('columns.date'),
      dataIndex: 'date',
      width: 110,
      render: (v: string) => formatDate(v),
    },
    {
      title: t('columns.fee'),
      width: 120,
      render: (_, r) => (r.status === 'pending' ? '—' : formatVnd(r.feeAmount)),
    },
    {
      title: t('columns.commission'),
      width: 120,
      render: (_, r) => (
        <b data-commission>{r.status === 'pending' ? '—' : formatVnd(r.commission)}</b>
      ),
    },
    {
      title: t('columns.status'),
      width: 140,
      render: (_, r) => (
        <span title={r.cancelReason ?? undefined}>
          <StatusTag lineHeight={22} tone={TONE[r.status]}>
            {t(`status.${r.status}`)}
          </StatusTag>
        </span>
      ),
    },
  ];
}

export function usePayoutColumns(): AdminTableProps<PayoutRow>['columns'] {
  const t = useTranslations('affiliate');
  return [
    {
      title: t('payouts.columns.month'),
      dataIndex: 'monthKey',
      width: 140,
      render: (v: string) => <b>{t('month', { month: monthLabel(v) })}</b>,
    },
    {
      title: t('payouts.columns.date'),
      dataIndex: 'paidAt',
      width: 120,
      render: (v: string) => formatDate(v),
    },
    {
      title: t('payouts.columns.holder'),
      width: 170,
      render: (_, r) => <b>{r.bank.bankHolder}</b>,
    },
    {
      title: t('payouts.columns.bank'),
      width: 200,
      render: (_, r) => `${r.bank.bankName} · ${r.bank.bankNo}`,
    },
    {
      title: t('payouts.columns.amount'),
      dataIndex: 'amount',
      width: 140,
      render: (v: number) => <b data-commission>{formatVnd(v)}</b>,
    },
    {
      title: t('payouts.columns.status'),
      width: 150,
      render: () => (
        <StatusTag lineHeight={22} tone="green">
          {t('payouts.paid')}
        </StatusTag>
      ),
    },
  ];
}
