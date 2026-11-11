'use client';

import type { TableProps } from 'antd';
import { formatNumber } from '@/i18n/format';
import { useLocale, useTranslations } from 'next-intl';
import { affiliateHistoryDate, affiliateMoney } from '../format';
import type { AffiliateCustomer } from '../types';
import { CommissionStatus } from './commission-status';
import { CustomerPayoutHistory } from './customer-payout-history';
import styles from './customer-layout.module.css';

export function useCustomerColumns(): NonNullable<TableProps<AffiliateCustomer>['columns']> {
  const locale = useLocale();
  const t = useTranslations('affiliate');
  return [
    {
      title: t('tabs.customers'),
      key: 'name',
      width: 'calc((100% - 382px) * 13 / 27)',
      render: (_, row) => <b>{row.name}</b>,
    },
    {
      title: t('columns.date'),
      key: 'date',
      width: 92,
      render: (_, row) => affiliateHistoryDate(row.date, locale),
    },
    {
      title: t('columns.rateShort'),
      key: 'rate',
      width: 90,
      render: (_, row) =>
        t(row.customerYear === 1 ? 'commissionFirstYear' : 'commissionRenewalYear', {
          rate: formatNumber(row.rate, locale),
          year: formatNumber(row.customerYear, locale),
        }),
    },
    {
      title: t('columns.commission'),
      key: 'commission',
      width: 96,
      render: (_, row) => <b className={styles.money}>{affiliateMoney(row.commission, locale)}</b>,
    },
    {
      title: t('columns.status'),
      key: 'status',
      width: 104,
      render: (_, row) => <CommissionStatus status={row.status} reason={row.cancelReason} />,
    },
    {
      title: t('columns.payoutHistory'),
      key: 'history',
      width: 'calc((100% - 382px) * 14 / 27)',
      render: (_, row) => <CustomerPayoutHistory row={row} />,
    },
  ];
}
