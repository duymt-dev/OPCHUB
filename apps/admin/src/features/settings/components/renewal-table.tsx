'use client';
import { AdminTable, EmptyState, type AdminTableProps } from '@opchub/ui';
import type { RenewalRow } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { RenewalExpiry, RenewalLastSent } from './renewal-cells';
import styles from './renewal.module.css';
export function RenewalTable({
  rows,
  busy,
  send,
}: {
  rows: RenewalRow[];
  busy: boolean;
  send: (id: string) => void;
}) {
  const t = useTranslations('settings.renewal');
  const columns: AdminTableProps<RenewalRow>['columns'] = [
    {
      key: 'member',
      title: t('member'),
      render: (_, r) => (
        <div className={styles.stack}>
          <b>{r.name}</b>
          <small>{r.email}</small>
        </div>
      ),
    },
    { key: 'plan', title: t('plan'), render: (_, r) => t(r.plan) },
    {
      key: 'until',
      title: t('until'),
      render: (_, r) => <RenewalExpiry row={r} />,
    },
    {
      key: 'next',
      title: t('next'),
      render: (_, r) => (
        <span className={styles.badge}>{r.nextMilestone ? t(r.nextMilestone) : '—'}</span>
      ),
    },
    {
      key: 'last',
      title: t('last'),
      render: (_, r) => <RenewalLastSent at={r.lastSentAt} />,
    },
    {
      key: 'send',
      title: t('actions'),
      align: 'right',
      render: (_, r) => (
        <button
          type="button"
          className={styles.send}
          disabled={busy}
          onClick={() => send(r.userId)}
        >
          {t('send')}
        </button>
      ),
    },
  ];
  return (
    <div className={styles.tableWrap} role="region" aria-label={t('listLabel')}>
      {rows.length ? (
        <AdminTable
          rowKey="userId"
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
