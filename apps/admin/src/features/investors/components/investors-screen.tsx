'use client';

import { DateRangePicker, ErrorState, PageHeader, Pagination } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { useInvestorParams } from '../hooks/use-investor-params';
import { useInvestorActions, useInvestors } from '../hooks/use-investors';
import { INVESTOR_PAGE_SIZES } from '../types';
import { InvestorDrawer } from './investor-drawer';
import { InvestorTable } from './investor-table';
import { InvestorStats, InvestorToolbar } from './investor-toolbar';
import styles from './investors.module.css';
import { useAdminUiLabels } from '@/i18n/ui-labels';

/** D-58 → D-60 Nhà đầu tư: orchestrator — thống kê, lọc (URL), bảng, phân trang, drawer */
export function InvestorsScreen() {
  const ui = useAdminUiLabels();
  const t = useTranslations('investors');
  const { params, update } = useInvestorParams();
  const { list, summary } = useInvestors(params);
  const act = useInvestorActions();
  // Drawer không có URL (D-39); giữ khóa để dữ liệu mới sau thao tác hiện ngay
  const [openKey, setOpenKey] = useState<string | null>(null);
  const rows = list.data?.items ?? [];
  const open = rows.find((x) => x.key === openKey) ?? null;
  const close = useCallback(() => setOpenKey(null), []);

  const copy = (phone: string) => {
    void navigator.clipboard?.writeText(phone).catch(() => undefined);
    act.toast(t('toast.copied'));
  };

  return (
    <>
      <PageHeader title={t('title')} subtitle=" " extra={<DateRangePicker {...ui.dateRange} />} />
      <div data-screen-label="Admin · Nhà đầu tư" className={styles.wrap}>
        <InvestorStats s={summary.data} />
        <div className={styles.card}>
          <InvestorToolbar
            q={params.q}
            kind={params.kind}
            summary={summary.data}
            onSearch={(q) => update({ q, page: 1 })}
            onKind={(kind) => update({ kind, page: 1 })}
            onCsv={() => act.exportCsv({ kind: params.kind, q: params.q })}
          />
          {list.isError ? (
            <ErrorState
              title={t('error')}
              retryLabel={t('retry')}
              onRetry={() => void list.refetch()}
            />
          ) : (
            <InvestorTable rows={rows} onOpen={(x) => setOpenKey(x.key)} />
          )}
          {list.isSuccess && rows.length === 0 ? (
            <div className={styles.empty}>{t('empty')}</div>
          ) : null}
          <Pagination
            page={params.page}
            size={params.size}
            total={list.data?.total ?? 0}
            sizeOptions={[...INVESTOR_PAGE_SIZES]}
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
      {open ? <InvestorDrawer x={open} onClose={close} onCopy={() => copy(open.phone)} /> : null}
    </>
  );
}
