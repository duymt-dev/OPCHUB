'use client';

import type { AffiliateAdminListRow } from '@opchub/shared/api-domains';
import { AdminTable, useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useAffiliateWrites } from '../hooks/use-affiliate-writes';
import type { AffiliateListTableProps } from '../types';
import { RateDialog } from './rate-dialog';
import { AffiliatePagination } from './affiliate-pagination';
import { useAffiliateColumns } from './affiliate-table-columns';
import styles from './affiliate.module.css';
import layout from './agent-layout.module.css';
import { AgentBulkBar } from './agent-bulk-bar';

export function AffiliateTable({
  rows,
  total,
  params,
  update,
  header,
  toolbar,
  loading,
}: AffiliateListTableProps<AffiliateAdminListRow>) {
  const t = useTranslations('affiliate');
  const toast = useToast();
  const writes = useAffiliateWrites();
  const [selection, setSelection] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const selected = (loading ? [] : rows)
    .filter((row) => selection.includes(row.id))
    .map((row) => row.id);
  return (
    <div className={`${styles.tableHost} ${layout.agents}`}>
      <AdminTable<AffiliateAdminListRow>
        rowKey="id"
        data={rows}
        title={header}
        loading={loading}
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
            <AgentBulkBar
              count={selected.length}
              onClear={() => setSelection([])}
              onEdit={() => {
                if (!loading && writes.access.guard('affiliate.action')) setEditing(true);
              }}
              onExport={() => writes.csv.mutate({ type: 'aff', ids: selected })}
              exportLoading={writes.csv.isPending}
            />
          </div>
        }
        columns={useAffiliateColumns(
          rows[0] ? rows[0].period.month : params.month === 'all' ? null : params.month,
        )}
      />
      <AffiliatePagination
        total={total}
        params={params}
        update={update}
        unit={t('pagination.affiliates')}
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
