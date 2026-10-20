'use client';

import type { TableProps } from 'antd';
import { useTranslations } from 'next-intl';
import type { AffiliateAdminRow } from '@opchub/shared/api-domains';
import Link from 'next/link';
import { affiliateMoney } from '../format';
import { CommissionStatus } from './commission-status';
import styles from './affiliate.module.css';

export function useAffiliateColumns(): NonNullable<TableProps<AffiliateAdminRow>['columns']> {
  const t = useTranslations('affiliate');
  return [
    {
      title: t('columns.agent'),
      key: 'agent',
      render: (_, row) => (
        <div className={styles.stack}>
          <Link data-ro-ok href={`/affiliate/${encodeURIComponent(row.id)}`}>
            <b>{row.name}</b>
          </Link>
          <span className={styles.hint}>{row.email}</span>
          <CommissionStatus status={row.status} />
        </div>
      ),
    },
    { title: t('columns.code'), dataIndex: 'code' },
    { title: t('columns.rate'), key: 'rate', render: (_, row) => `${row.rate}%` },
    { title: t('columns.customers'), dataIndex: 'customers' },
    {
      title: t('columns.revenue'),
      key: 'revenue',
      render: (_, row) => affiliateMoney(row.revenue),
    },
    {
      title: t('stats.payable'),
      key: 'balance',
      render: (_, row) => affiliateMoney(row.balance),
    },
    {
      title: t('columns.monthStatus'),
      key: 'status',
      render: (_, row) => <CommissionStatus status={row.monthStatus} />,
    },
    {
      title: t('columns.reconcile'),
      key: 'detail',
      render: (_, row) => (
        <Link data-ro-ok href={`/affiliate/${encodeURIComponent(row.id)}`}>
          {t('detail')}
        </Link>
      ),
    },
  ];
}
