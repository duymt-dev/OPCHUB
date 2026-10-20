'use client';

import type { TableProps } from 'antd';
import { useTranslations } from 'next-intl';
import type { AffiliateAdminRow } from '@opchub/shared/api-domains';
import Link from 'next/link';
import { affiliateMoney } from '../format';
import { CommissionStatus } from './commission-status';
import { AgentIdentity } from './agent-identity';

export function useAffiliateColumns(): NonNullable<TableProps<AffiliateAdminRow>['columns']> {
  const t = useTranslations('affiliate');
  return [
    {
      title: t('columns.agentName'),
      key: 'agent',
      width: 'calc(100% - 824px)',
      render: (_, row) => <AgentIdentity {...row} />,
    },
    { title: t('columns.code'), dataIndex: 'code', width: 100 },
    { title: t('columns.rateShort'), key: 'rate', width: 70, render: (_, row) => `${row.rate}%` },
    { title: t('columns.customers'), dataIndex: 'customers', width: 90 },
    {
      title: t('columns.revenue'),
      key: 'revenue',
      width: 130,
      render: (_, row) => affiliateMoney(row.revenue),
    },
    {
      title: t('stats.payable'),
      key: 'balance',
      width: 140,
      render: (_, row) => affiliateMoney(row.balance),
    },
    {
      title: t('columns.monthStatus'),
      key: 'status',
      width: 140,
      render: (_, row) => <CommissionStatus status={row.monthStatus} />,
    },
    {
      title: t('columns.reconcile'),
      key: 'detail',
      width: 110,
      render: (_, row) => (
        <Link data-ro-ok href={`/affiliate/${encodeURIComponent(row.id)}`}>
          {t('columns.reconcile')}
        </Link>
      ),
    },
  ];
}
