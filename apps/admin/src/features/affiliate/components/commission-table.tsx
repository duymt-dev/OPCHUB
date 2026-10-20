'use client';

import { AdminTable, BulkBar, useToast } from '@opchub/ui';
import { Button } from 'antd';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useAffiliateWrites } from '../hooks/use-affiliate-writes';
import type { AffiliateListTableProps, CommissionRow } from '../types';
import { CancelDialog } from './cancel-dialog';
import { AffiliatePagination } from './affiliate-pagination';
import { useCommissionColumns } from './commission-table-columns';
import styles from './affiliate.module.css';

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
    <div className={styles.tableHost}>
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
          <div className={styles.wrap}>
            {toolbar}
            <BulkBar
              count={selected.length}
              onClear={() => setSelection([])}
              actions={
                <>
                  <Button danger onClick={() => cancel(selected)}>
                    {t('cancel')}
                  </Button>
                  <Button
                    loading={writes.csv.isPending}
                    onClick={() => writes.csv.mutate({ type: 'com', ids: selected })}
                  >
                    {t('export')}
                  </Button>
                </>
              }
            />
          </div>
        }
        columns={useCommissionColumns(cancel)}
      />
      <AffiliatePagination total={total} params={params} update={update} />
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
