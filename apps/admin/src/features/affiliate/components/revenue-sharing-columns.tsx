'use client';

import type { RevenueDirector } from '@opchub/shared/api-domains';
import { Button } from 'antd';
import type { TableProps } from 'antd';
import { useTranslations } from 'next-intl';
import { revenueMoney } from '../revenue-presentation';
import type { RevenueTableProps } from '../revenue-types';
import styles from './revenue-sharing.module.css';
import { RevenueDirectorIdentity } from './revenue-director-identity';

export function useRevenueColumns(
  props: RevenueTableProps,
  open: string | null,
  toggle: (id: string) => void,
): NonNullable<TableProps<RevenueDirector>['columns']> {
  const t = useTranslations('revenue');
  return [
    {
      title: t('columns.director'),
      key: 'director',
      width: 240,
      render: (_, row) => (
        <RevenueDirectorIdentity row={row} open={open === row.id} onToggle={() => toggle(row.id)} />
      ),
    },
    {
      title: t('columns.bank'),
      key: 'bank',
      width: 190,
      render: (_, row) => (
        <div className={styles.bank}>
          <b>{row.bank?.bankHolder ?? t('missingBank')}</b>
          <small>{row.bank ? `${row.bank.bankName} · ${row.bank.bankNo}` : '—'}</small>
        </div>
      ),
    },
    {
      title: t('columns.affiliates'),
      key: 'affiliates',
      width: 80,
      render: (_, row) => row.stats.affiliateCount,
    },
    {
      title: t('columns.receipts'),
      key: 'receipts',
      width: 90,
      render: (_, row) => row.stats.receiptCount,
    },
    {
      title: t('columns.total'),
      key: 'total',
      render: (_, row) => revenueMoney(row.stats.allocated),
    },
    {
      title: t('columns.paid'),
      key: 'paid',
      render: (_, row) => <span className={styles.paid}>{revenueMoney(row.stats.paid)}</span>,
    },
    {
      title: t('columns.due'),
      key: 'due',
      render: (_, row) => <b className={styles.due}>{revenueMoney(row.stats.due)}</b>,
    },
    {
      key: 'action',
      width: 120,
      render: (_, row) =>
        BigInt(row.stats.due) > 0n ? (
          <Button
            type="primary"
            size="small"
            disabled={!props.canPay || !row.bank}
            title={!row.bank ? t('missingBank') : undefined}
            onClick={() => props.onPay(row)}
          >
            {t('pay')}
          </Button>
        ) : (
          <small>{t('noDue')}</small>
        ),
    },
  ];
}
