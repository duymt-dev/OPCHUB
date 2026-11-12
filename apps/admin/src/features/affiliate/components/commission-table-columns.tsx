'use client';

import type { TableProps } from 'antd';
import { formatNumber } from '@/i18n/format';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { affiliateDate, affiliateMoney } from '../format';
import type { CommissionRow } from '../types';
import { CommissionStatus } from './commission-status';
import { CommissionStatusMenu } from './commission-status-menu';

export function useCommissionColumns(
  cancel: (ids: string[]) => void,
  restore: (ids: string[]) => void,
): NonNullable<TableProps<CommissionRow>['columns']> {
  const locale = useLocale();
  const t = useTranslations('affiliate');
  return [
    {
      title: t('columns.date'),
      key: 'date',
      width: 100,
      render: (_, row) => affiliateDate(row.date, locale),
    },
    { title: t('columns.customer'), dataIndex: 'customerName' },
    {
      title: t('columns.affiliate'),
      key: 'affiliate',
      render: (_, row) => (
        <Link data-ro-ok href={`/affiliate/${encodeURIComponent(row.affiliateId)}`}>
          {row.affiliateName}
        </Link>
      ),
    },
    {
      title: t('columns.revenue'),
      key: 'revenue',
      width: 110,
      render: (_, row) => affiliateMoney(row.feeAmount, locale),
    },
    {
      title: t('columns.rate'),
      key: 'rate',
      width: 150,
      render: (_, row) =>
        t(row.customerYear === 1 ? 'commissionFirstYear' : 'commissionRenewalYear', {
          rate: formatNumber(row.rate, locale),
          year: formatNumber(row.customerYear, locale),
        }),
    },
    {
      title: t('columns.commission'),
      key: 'amount',
      width: 110,
      render: (_, row) => <b>{affiliateMoney(row.amount, locale)}</b>,
    },
    {
      title: t('columns.status'),
      key: 'status',
      width: 120,
      render: (_, row) => <CommissionStatus status={row.status} reason={row.cancelReason} />,
    },
    {
      title: '',
      key: 'actions',
      width: 48,
      render: (_, row) => <CommissionStatusMenu row={row} cancel={cancel} restore={restore} />,
    },
  ];
}
