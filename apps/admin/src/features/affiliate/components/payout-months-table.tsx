'use client';

import { AdminTable } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import type { AffiliateDetail, AffiliateDetailParams, AffiliateMonthRow } from '../types';
import { usePayoutColumns } from './payout-months-table-columns';
import { AffiliatePagination } from './affiliate-pagination';
import { DETAIL_PAGE_SIZES } from '../model';
import styles from './affiliate.module.css';

export function PayoutMonthsTable({
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
        columns={usePayoutColumns()}
      />
      <AffiliatePagination
        total={total}
        params={params}
        update={update}
        unit={t('pagination.months')}
        sizes={DETAIL_PAGE_SIZES}
      />
    </div>
  );
}
