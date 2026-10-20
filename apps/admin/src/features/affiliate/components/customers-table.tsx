'use client';

import { AdminTable } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { DETAIL_PAGE_SIZES } from '../model';
import type { AffiliateCustomer, AffiliateCustomersTableProps } from '../types';
import { useCustomerColumns } from './customer-table-columns';
import { AffiliatePagination } from './affiliate-pagination';
import styles from './affiliate.module.css';
import layout from './customer-layout.module.css';

export function CustomersTable({
  rows,
  total,
  params,
  update,
  header,
  loading,
}: AffiliateCustomersTableProps) {
  const t = useTranslations('affiliate');
  return (
    <div className={`${styles.tableHost} ${layout.customers}`}>
      <AdminTable<AffiliateCustomer>
        rowKey="id"
        title={header}
        data={rows}
        total={total}
        loading={loading}
        empty={t('empty')}
        page={params.page}
        pageSize={params.size}
        pagination={false}
        onPageChange={(page, size) => update({ page, size })}
        columns={useCustomerColumns()}
      />
      <AffiliatePagination
        total={total}
        params={params}
        update={update}
        unit={t('pagination.customers')}
        sizes={DETAIL_PAGE_SIZES}
      />
    </div>
  );
}
