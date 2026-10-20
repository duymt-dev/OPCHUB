'use client';

import type { TableProps } from 'antd';
import { useTranslations } from 'next-intl';
import { Button, Dropdown } from 'antd';
import Link from 'next/link';
import { affiliateDate, affiliateMoney } from '../format';
import type { CommissionRow } from '../types';
import { CommissionStatus } from './commission-status';

export function useCommissionColumns(
  cancel: (ids: string[]) => void,
): NonNullable<TableProps<CommissionRow>['columns']> {
  const t = useTranslations('affiliate');
  return [
    { title: t('columns.date'), key: 'date', render: (_, row) => affiliateDate(row.date) },
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
      render: (_, row) => affiliateMoney(row.feeAmount),
    },
    { title: t('columns.rate'), key: 'rate', render: (_, row) => `${row.rate}%` },
    {
      title: t('columns.commission'),
      key: 'amount',
      render: (_, row) => <b>{affiliateMoney(row.amount)}</b>,
    },
    {
      title: t('columns.status'),
      key: 'status',
      render: (_, row) => <CommissionStatus status={row.status} reason={row.cancelReason} />,
    },
    {
      title: '',
      key: 'actions',
      render: (_, row) =>
        row.status === 'recorded' ? (
          <Dropdown
            menu={{
              items: [{ key: 'cancel', label: t('cancel'), danger: true }],
              onClick: () => cancel([row.id]),
            }}
          >
            <Button size="small" aria-label={t('changeStatus')}>
              {t('changeStatus')}
            </Button>
          </Dropdown>
        ) : null,
    },
  ];
}
