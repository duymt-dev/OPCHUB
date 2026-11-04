'use client';
import { AffiliateRegionCell } from './affiliate-region-cell';

import type { TableProps } from 'antd';
import { useTranslations } from 'next-intl';
import type { AffiliateAdminListRow } from '@opchub/shared/api-domains';
import Link from 'next/link';
import { affiliateMoney } from '../format';
import { AgentIdentity } from './agent-identity';
import { AgentPeriodAmount, AgentPeriodStatus } from './agent-period';
import { affiliateMonthLabel } from '../model';

export function useAffiliateColumns(
  month: string | null,
): NonNullable<TableProps<AffiliateAdminListRow>['columns']> {
  const t = useTranslations('affiliate');
  return [
    {
      title: t('columns.agentName'),
      key: 'agent',
      width: 270,
      render: (_, row) => <AgentIdentity {...row} />,
    },
    {
      title: t('regionColumn'),
      key: 'region',
      width: 230,
      render: (_, row) => <AffiliateRegionCell region={row.region} />,
    },
    { title: t('columns.code'), dataIndex: 'code', width: 110 },
    { title: t('columns.rateShort'), key: 'rate', width: 70, render: (_, row) => `${row.rate}%` },
    {
      title: t('columns.customers'),
      key: 'customers',
      width: 90,
      render: (_, row) => row.lifetime.customers,
    },
    {
      title: t('columns.revenue'),
      key: 'revenue',
      width: 120,
      render: (_, row) => affiliateMoney(row.lifetime.revenue),
    },
    {
      title: t('periodCommission', { month: month ? affiliateMonthLabel(month) : t('allMonths') }),
      key: 'balance',
      width: 130,
      render: (_, row) => <AgentPeriodAmount period={row.period} />,
    },
    {
      title: t('columns.monthStatus'),
      key: 'status',
      width: 150,
      render: (_, row) => <AgentPeriodStatus status={row.period.status} />,
    },
    {
      title: t('columns.reconcile'),
      key: 'detail',
      width: 120,
      render: (_, row) => (
        <Link data-ro-ok href={`/affiliate/${encodeURIComponent(row.id)}`}>
          {t('columns.reconcile')}
        </Link>
      ),
    },
  ];
}
