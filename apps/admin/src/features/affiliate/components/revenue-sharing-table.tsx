'use client';

import { AdminTable } from '@opchub/ui';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { RevenueTableProps } from '../revenue-types';
import { useRevenueColumns } from './revenue-sharing-columns';
import { DirectorRevenueDetail } from './director-revenue-detail';
import styles from './revenue-sharing.module.css';

export function RevenueSharingTable(props: RevenueTableProps) {
  const t = useTranslations('revenue');
  const [open, setOpen] = useState<string | null>(null);
  const columns = useRevenueColumns(props, open, (id) => setOpen(open === id ? null : id));
  return (
    <div className={styles.table}>
      <AdminTable
        rowKey="id"
        data={props.rows}
        columns={columns}
        pagination={false}
        empty={
          <span className={styles.emptyFeedback} role="status">
            {t('noMatches')}
          </span>
        }
        expandable={{
          showExpandColumn: false,
          expandedRowKeys: open ? [open] : [],
          expandedRowRender: (row) =>
            row.directorId ? (
              <DirectorRevenueDetail
                directorId={row.directorId}
                receiptCount={row.stats.receiptCount}
              />
            ) : null,
          rowExpandable: (row) => Boolean(row.directorId),
        }}
      />
    </div>
  );
}
