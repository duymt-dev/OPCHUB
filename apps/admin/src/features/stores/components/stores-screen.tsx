'use client';

import { ErrorState, Icon, PageHeader } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { useCan } from '@/lib/permissions';
import { useSelection } from '../hooks/use-selection';
import { useStoreParams } from '../hooks/use-store-params';
import {
  useStoreDetail,
  useStoreFeature,
  useStoreModeration,
  useStores,
} from '../hooks/use-stores';
import { StoreBulkBar, StorePager } from './store-bars';
import { StoreDrawer } from './store-drawer';
import { StoreTable } from './store-table';
import { StoreKpis, StoreToolbar } from './store-toolbar';
import styles from './stores.module.css';

/** Tiêu đề trang + ô khoảng ngày (prototype `showRange`) */
function StoresHeader() {
  const t = useTranslations('stores');
  return (
    <PageHeader
      title={t('title')}
      extra={
        <div className={styles.range}>
          <Icon name="calendar" stroke="rgba(0,0,0,0.65)" />
          {t('dateRange')}
          <Icon name="chevronDown" size={14} stroke="rgba(0,0,0,0.45)" />
        </div>
      }
    />
  );
}

/** V4-608 AD-07 Admin › Gian hàng: orchestrator — KPI, lọc (URL), bảng chọn nhiều, chi tiết */
export function StoresScreen() {
  const t = useTranslations('stores');
  const { params, update } = useStoreParams();
  const list = useStores(params);
  const canAct = useCan('stores.action');
  const { sel, toggle, togglePage, clear } = useSelection();
  const [openId, setOpenId] = useState<string | null>(null);
  const detail = useStoreDetail(openId);
  const close = useCallback(() => setOpenId(null), []);
  const mod = useStoreModeration(clear);
  const feature = useStoreFeature();

  const open = detail.data;
  const data = list.data;
  const rows = data?.items ?? [];
  const pages = data ? Math.max(1, Math.ceil(data.total / data.size)) : 1;

  return (
    <>
      <StoresHeader />
      <div data-screen-label="Admin · Gian hàng" className={styles.wrap}>
        <StoreKpis s={data?.summary} />
        <div className={styles.card}>
          <StoreToolbar
            q={params.q}
            status={params.status}
            summary={data?.summary}
            onSearch={(q) => update({ q, page: 1 })}
            onStatus={(status) => update({ status, page: 1 })}
          />
          {sel.size > 0 ? (
            <StoreBulkBar
              count={sel.size}
              canAct={canAct}
              onShow={() => mod.show([...sel])}
              onHide={() => mod.hide([...sel])}
              onClear={clear}
            />
          ) : null}
          {list.isError ? (
            <ErrorState
              title={t('error')}
              retryLabel={t('retry')}
              onRetry={() => void list.refetch()}
            />
          ) : (
            <StoreTable
              rows={rows}
              sel={sel}
              canAct={canAct}
              onToggle={toggle}
              onToggleAll={() => togglePage(rows.map((r) => r.id))}
              onOpen={setOpenId}
              onHide={(id) => mod.hide([id])}
              onShow={(id) => mod.show([id])}
            />
          )}
          {list.isSuccess && rows.length === 0 ? (
            <div className={styles.empty}>{t('empty')}</div>
          ) : null}
          <StorePager
            page={params.page}
            pages={pages}
            total={data?.total ?? 0}
            onPage={(page) => update({ page })}
          />
        </div>
      </div>
      {openId && open ? (
        <StoreDrawer
          x={open}
          canAct={canAct}
          onClose={close}
          onHide={() => mod.hide([open.id])}
          onShow={() => mod.show([open.id])}
          onFeature={(on) => feature(open.id, on)}
        />
      ) : null}
    </>
  );
}
