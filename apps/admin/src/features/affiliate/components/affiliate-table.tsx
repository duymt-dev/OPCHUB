'use client';

import type { AffiliateAdminRow } from '@opchub/shared/api-domains';
import { AdminTable, BulkBar, useToast } from '@opchub/ui';
import { Button } from 'antd';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useAffiliateWrites } from '../hooks/use-affiliate-writes';
import type { AffiliateListTableProps } from '../types';
import { RateDialog } from './rate-dialog';
import { useAffiliateColumns } from './affiliate-table-columns';
import styles from './affiliate.module.css';

export function AffiliateTable({
  rows,
  total,
  params,
  update,
  header,
  toolbar,
  loading,
}: AffiliateListTableProps<AffiliateAdminRow>) {
  const t = useTranslations('affiliate');
  const toast = useToast();
  const writes = useAffiliateWrites();
  const [selection, setSelection] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const selected = (loading ? [] : rows)
    .filter((row) => selection.includes(row.id))
    .map((row) => row.id);
  return (
    <div className={styles.tableHost}>
      <AdminTable<AffiliateAdminRow>
        rowKey="id"
        data={rows}
        title={header}
        loading={loading}
        total={total}
        page={params.page}
        pageSize={params.size}
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
                  <Button
                    onClick={() => {
                      if (!loading && writes.access.guard('affiliate.action')) setEditing(true);
                    }}
                  >
                    {t('rate')}
                  </Button>
                  <Button
                    loading={writes.csv.isPending}
                    onClick={() => writes.csv.mutate({ type: 'aff', ids: selected })}
                  >
                    {t('export')}
                  </Button>
                </>
              }
            />
          </div>
        }
        columns={useAffiliateColumns()}
      />
      {editing ? (
        <RateDialog
          ids={selected}
          onClose={() => {
            setEditing(false);
            setSelection([]);
          }}
        />
      ) : null}
    </div>
  );
}
