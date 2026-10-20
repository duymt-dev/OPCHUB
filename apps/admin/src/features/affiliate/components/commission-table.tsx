'use client';

import { AdminTable, useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useAffiliateWrites } from '../hooks/use-affiliate-writes';
import type { AffiliateListTableProps, CommissionRow } from '../types';
import { CancelDialog } from './cancel-dialog';
import { AffiliatePagination } from './affiliate-pagination';
import { useCommissionColumns } from './commission-table-columns';
import { CommissionBulkBar } from './commission-bulk-bar';
import styles from './affiliate.module.css';
import layout from './commission-layout.module.css';
import bulkLayout from './bulk-layout.module.css';

export function CommissionTable({
  rows,
  total,
  params,
  update,
  header,
  toolbar,
  loading,
}: AffiliateListTableProps<CommissionRow>) {
  const t = useTranslations('affiliate');
  const toast = useToast();
  const writes = useAffiliateWrites();
  const [selection, setSelection] = useState<string[]>([]);
  const [cancelling, setCancelling] = useState<string[] | null>(null);
  const selected = (loading ? [] : rows)
    .filter((row) => selection.includes(row.id))
    .map((row) => row.id);
  const cancel = (ids: string[]) => {
    if (!loading && writes.access.guard('affiliate.action')) setCancelling(ids);
  };
  return (
    <div className={`${styles.tableHost} ${layout.commissions} ${bulkLayout.selection}`}>
      <AdminTable<CommissionRow>
        rowKey="id"
        data={rows}
        loading={loading}
        title={header}
        total={total}
        page={params.page}
        pageSize={params.size}
        pagination={false}
        onPageChange={(page, size) => update({ page, size })}
        empty={t('empty')}
        selectedKeys={selected}
        onSelect={(keys) => {
          if (keys.length > 100) {
            toast(t('selectLimit'));
            return;
          }
          setSelection(keys.map(String));
        }}
        toolbar={
          <div className={`${styles.wrap} ${bulkLayout.stack}`}>
            {toolbar}
            <CommissionBulkBar
              count={selected.length}
              onClear={() => setSelection([])}
              onCancel={() => cancel(selected)}
              onExport={() => writes.csv.mutate({ type: 'com', ids: selected })}
              exportLoading={writes.csv.isPending}
            />
          </div>
        }
        columns={useCommissionColumns(cancel)}
      />
      <AffiliatePagination
        total={total}
        params={params}
        update={update}
        unit={t('pagination.transactions')}
      />
      {cancelling ? (
        <CancelDialog
          key={cancelling.join(',')}
          ids={cancelling}
          onClose={() => {
            setCancelling(null);
            setSelection([]);
          }}
        />
      ) : null}
    </div>
  );
}
