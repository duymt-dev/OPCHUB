'use client';
import { BankTxnStatus, BankTxnAction } from './bank-txn-cells';
import { AdminTable, EmptyState, type AdminTableProps } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import type { BankTxnRow } from '@opchub/shared/api-domains';
import styles from './bank.module.css';

export function BankTxnTable({
  rows,
  busy,
  canAct,
  assign,
  short,
}: {
  rows: BankTxnRow[];
  busy: boolean;
  canAct: boolean;
  assign: (r: BankTxnRow) => void;
  short: (r: BankTxnRow) => void;
}) {
  const t = useTranslations('settings.bank');
  const columns: AdminTableProps<BankTxnRow>['columns'] = [
    {
      key: 'time',
      width: 110,
      title: t('time'),
      render: (_, r) =>
        new Date(r.receivedAt)
          .toLocaleString('vi-VN', {
            timeZone: 'Asia/Ho_Chi_Minh',
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })
          .replace(',', ''),
    },
    {
      key: 'amount',
      width: 94,
      title: t('amount'),
      render: (_, r) => `${new Intl.NumberFormat('vi-VN').format(r.amount)}đ`,
    },
    { key: 'content', width: 186, title: t('content'), render: (_, r) => <code>{r.content}</code> },
    { key: 'member', width: 126, title: t('member'), render: (_, r) => r.memberName ?? '—' },
    { key: 'status', width: 154, title: t('status'), render: (_, r) => <BankTxnStatus row={r} /> },
    {
      key: 'action',
      width: 148,
      title: <span className={styles.srOnly}>{t('actions')}</span>,
      align: 'right',
      render: (_, r) => (
        <BankTxnAction row={r} busy={busy} canAct={canAct} assign={assign} short={short} />
      ),
    },
  ];
  return (
    <div className={styles.tableWrap} role="region" aria-label={t('recent')}>
      {rows.length ? (
        <AdminTable
          rowKey="id"
          columns={columns}
          data={rows}
          pagination={false}
          empty={t('empty')}
        />
      ) : (
        <EmptyState title={t('empty')} />
      )}
    </div>
  );
}
