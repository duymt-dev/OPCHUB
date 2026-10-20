'use client';

import type { TableProps } from 'antd';
import { useTranslations } from 'next-intl';
import { Button } from 'antd';
import { affiliateDate, affiliateMoney } from '../format';
import { affiliateMonthLabel, isClosedAffiliateMonth } from '../model';
import type { AffiliateMonthRow } from '../types';
import { CommissionStatus } from './commission-status';

export function usePayoutColumns(
  onPay: (row: AffiliateMonthRow) => void,
): NonNullable<TableProps<AffiliateMonthRow>['columns']> {
  const t = useTranslations('affiliate');
  return [
    {
      title: t('columns.month'),
      key: 'month',
      render: (_, row) => affiliateMonthLabel(row.monthKey),
    },
    { title: t('columns.customers'), dataIndex: 'customers' },
    {
      title: t('columns.commission'),
      key: 'amount',
      render: (_, row) => affiliateMoney(row.amount),
    },
    {
      title: t('columns.status'),
      key: 'status',
      render: (_, row) => <CommissionStatus status={row.status} />,
    },
    {
      title: t('columns.paidAt'),
      key: 'paidAt',
      render: (_, row) => affiliateDate(row.paidAt),
    },
    {
      title: t('payout'),
      key: 'payout',
      render: (_, row) =>
        row.payable > 0 && isClosedAffiliateMonth(row.monthKey) ? (
          <Button
            size="small"
            type="primary"
            onClick={() => {
              onPay(row);
            }}
          >
            {t('payout')}
          </Button>
        ) : (
          '—'
        ),
    },
  ];
}
