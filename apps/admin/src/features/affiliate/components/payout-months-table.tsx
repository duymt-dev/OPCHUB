'use client';

import { AdminTable } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import { useAffiliateAccess } from '../hooks/use-affiliate-access';
import type { AffiliateDetail, AffiliateDetailParams, AffiliateMonthRow } from '../types';
import { PayoutDialog, type PayoutIntent } from './payout-dialog';
import { usePayoutColumns } from './payout-months-table-columns';
import { AffiliatePagination } from './affiliate-pagination';
import styles from './affiliate.module.css';

export function PayoutMonthsTable({
  agent,
  rows,
  total,
  params,
  update,
  header,
  loading,
}: {
  agent: AffiliateDetail;
  rows: AffiliateMonthRow[];
  total: number;
  params: AffiliateDetailParams;
  update: (patch: Partial<AffiliateDetailParams>) => void;
  header: ReactNode;
  loading: boolean;
}) {
  const t = useTranslations('affiliate');
  const access = useAffiliateAccess();
  const [intent, setIntent] = useState<PayoutIntent | null>(null);
  return (
    <div className={styles.tableHost}>
      <AdminTable<AffiliateMonthRow>
        rowKey="monthKey"
        title={header}
        data={rows}
        total={total}
        loading={loading}
        empty={t('empty')}
        page={params.page}
        pageSize={params.size}
        pagination={false}
        onPageChange={(page, size) => update({ page, size })}
        columns={usePayoutColumns((row) => {
          if (!loading && access.guard('affiliate.payout'))
            setIntent({
              id: agent.id,
              name: agent.name,
              month: row.monthKey,
              amount: row.payable,
              key: crypto.randomUUID(),
            });
        })}
      />
      <AffiliatePagination total={total} params={params} update={update} />
      {intent ? <PayoutDialog intent={intent} onClose={() => setIntent(null)} /> : null}
    </div>
  );
}
