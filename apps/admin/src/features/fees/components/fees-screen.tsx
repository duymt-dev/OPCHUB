'use client';

import { DateRangePicker, ErrorState, PageHeader, Pagination } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useFeeActions } from '../hooks/use-fee-actions';
import { useFeeParams } from '../hooks/use-fee-params';
import { useFeeSelection } from '../hooks/use-fee-selection';
import { useFees } from '../hooks/use-fees';
import { FEE_PAGE_SIZES } from '../types';
import { FeeBulkBar } from './fee-bulk-bar';
import { FeeStats } from './fee-stats';
import { FeeTable } from './fee-table';
import { FeeToolbar } from './fee-toolbar';
import styles from './fees.module.css';
import { useAdminUiLabels } from '@/i18n/ui-labels';

/** D-18 → D-22 Phí thành viên: thống kê, lọc, chọn hàng loạt, thao tác dòng, phân trang */
export function FeesScreen() {
  const ui = useAdminUiLabels();
  const t = useTranslations('fees');
  const { params, update } = useFeeParams();
  const { list, summary } = useFees(params);
  const rows = list.data?.items ?? [];
  const sel = useFeeSelection(rows.map((r) => r.userId));
  const act = useFeeActions(sel.clear);

  return (
    <>
      <PageHeader
        title={t('title')}
        // Prototype có dòng mô tả rỗng (pageSub '') vẫn chiếm khoảng cách 4px; khoảng trắng → cao 0
        subtitle=" "
        extra={<DateRangePicker {...ui.dateRange} />}
      />
      <div className={styles.wrap}>
        <FeeStats summary={summary.data} />
        <div className={styles.card}>
          <FeeToolbar
            q={params.q}
            status={params.status}
            summary={summary.data}
            onSearch={(q) => update({ q, page: 1 })}
            onTab={(status) => update({ status, page: 1 })}
            onRemindAll={act.onRemindAll}
          />
          <FeeBulkBar
            count={sel.selected.size}
            onCollect={() => act.onBulkCollect(sel.ids)}
            onRemind={() => act.onBulkRemind(sel.ids)}
            onCsv={() => act.onExport(sel.ids)}
            onClear={sel.clear}
          />
          {list.isError ? (
            <ErrorState
              title={t('error')}
              retryLabel={t('retry')}
              onRetry={() => void list.refetch()}
            />
          ) : (
            <FeeTable
              rows={rows}
              selected={sel.selected}
              onToggle={sel.toggle}
              onToggleAll={sel.toggleAll}
              onAction={act.onRow}
            />
          )}
          {list.isSuccess && rows.length === 0 ? (
            <div className={styles.empty}>{t('empty')}</div>
          ) : null}
          <Pagination
            page={params.page}
            size={params.size}
            total={list.data?.total ?? 0}
            sizeOptions={[...FEE_PAGE_SIZES]}
            onChange={(page) => update({ page })}
            onSizeChange={(size) => update({ size, page: 1 })}
            labels={{
              ...ui.pagination,
              unit: t('pager.unit'),
              prev: t('pager.prev'),
              next: t('pager.next'),
              pageSize: t('pager.pageSize'),
            }}
          />
        </div>
      </div>
    </>
  );
}
