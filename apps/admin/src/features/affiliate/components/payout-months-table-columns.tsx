'use client';

import type { TableProps } from 'antd';
import { useTranslations } from 'next-intl';
import { Button } from 'antd';
import { affiliateDate, affiliateMoney } from '../format';
import { affiliateMonthLabel, isClosedAffiliateMonth } from '../model';
import type { AffiliateMonthRow } from '../types';
import { MonthStatus } from './month-status';
import styles from './affiliate-detail.module.css';

export function usePayoutColumns(
  onPay: (row: AffiliateMonthRow) => void,
): NonNullable<TableProps<AffiliateMonthRow>['columns']> {
  const t = useTranslations('affiliate');
  return [
    {
      title: t('columns.month'),
      key: 'month',
      render: (_, row) => (
        <b>
          {t('columns.month')} {affiliateMonthLabel(row.monthKey)}
        </b>
      ),
    },
    { title: t('monthCustomers'), dataIndex: 'customers', width: 70 },
    {
      title: t('columns.commission'),
      key: 'amount',
      width: 120,
      render: (_, row) => <b className={styles.monthMoney}>{affiliateMoney(row.amount)}</b>,
    },
    {
      title: t('columns.status'),
      key: 'status',
      width: 110,
      render: (_, row) => <MonthStatus status={row.status} />,
    },
    {
      title: t('columns.paidAt'),
      key: 'paidAt',
      width: 100,
      render: (_, row) => affiliateDate(row.paidAt),
    },
    {
      title: t('payout'),
      key: 'payout',
      width: 90,
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
