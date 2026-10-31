'use client';

import type { RevenueLedgerItem } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { revenueDate, revenueMoney } from '../revenue-presentation';

export function useRevenueLedgerColumns() {
  const t = useTranslations('revenue');
  return [
    {
      title: t('columns.date'),
      key: 'date',
      width: 90,
      render: (_: unknown, row: RevenueLedgerItem) => revenueDate(row.receivedAt),
    },
    {
      title: t('columns.customer'),
      key: 'customer',
      width: 'calc((100cqw - 90px) * 12 / 65)',
      render: (_: unknown, row: RevenueLedgerItem) => row.customerName ?? row.customerId,
    },
    {
      title: t('columns.affiliate'),
      key: 'affiliate',
      width: 'calc((100cqw - 90px) * 12 / 65)',
      render: (_: unknown, row: RevenueLedgerItem) => row.affiliateName ?? row.affiliateId ?? '—',
    },
    {
      title: t('columns.amount'),
      key: 'amount',
      width: 'calc((100cqw - 90px) * 10 / 65)',
      render: (_: unknown, row: RevenueLedgerItem) => revenueMoney(row.amount),
    },
    {
      title: t('columns.rate'),
      key: 'rate',
      width: 'calc((100cqw - 90px) * 12 / 65)',
      render: (_: unknown, row: RevenueLedgerItem) =>
        t('rateYear', { rate: row.directorRate, year: row.customerYear }),
    },
    {
      title: t('columns.share'),
      key: 'share',
      width: 'calc((100cqw - 90px) * 9 / 65)',
      render: (_: unknown, row: RevenueLedgerItem) => <b>{revenueMoney(row.directorAmount)}</b>,
    },
    {
      title: t('columns.status'),
      key: 'status',
      width: 'calc((100cqw - 90px) * 10 / 65)',
      render: (_: unknown, row: RevenueLedgerItem) => t(row.status === 'paid' ? 'paid' : 'pending'),
    },
  ];
}
