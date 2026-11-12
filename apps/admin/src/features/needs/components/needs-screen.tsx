'use client';

import { DateRangePicker, ErrorState, PageHeader } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useCan } from '@/lib/permissions';
import { useNeedParams } from '../hooks/use-need-params';
import { useNeedModeration, useNeeds, useSelection } from '../hooks/use-needs';
import { NeedBulkBar, NeedPager } from './need-bars';
import { NeedTable } from './need-table';
import { NeedKpis, NeedToolbar } from './need-toolbar';
import styles from './needs.module.css';
import { useAdminUiLabels } from '@/i18n/ui-labels';

/** Tiêu đề trang + ô khoảng ngày (prototype `showRange`) */
function NeedsHeader() {
  const ui = useAdminUiLabels();
  const t = useTranslations('needs');
  return (
    <PageHeader
      title={t('title')}
      // Prototype có dòng mô tả rỗng (pageSub '') vẫn chiếm khoảng cách 4px; khoảng trắng → cao 0
      subtitle=" "
      extra={<DateRangePicker {...ui.dateRange} />}
    />
  );
}

/** V4-609 AD-07 Admin › Nhu cầu: orchestrator — KPI, lọc (URL), bảng chọn nhiều, ẩn / hiện */
export function NeedsScreen() {
  const t = useTranslations('needs');
  const { params, update } = useNeedParams();
  const list = useNeeds(params);
  const canAct = useCan('stores.action');
  const { sel, toggle, togglePage, clear } = useSelection();
  const mod = useNeedModeration(clear);

  const data = list.data;
  const rows = data?.items ?? [];
  const pages = data ? Math.max(1, Math.ceil(data.total / data.size)) : 1;

  return (
    <>
      <NeedsHeader />
      <div data-screen-label="Admin · Nhu cầu địa phương" className={styles.wrap}>
        <NeedKpis s={data?.summary} />
        <div className={styles.card}>
          <NeedToolbar
            q={params.q}
            status={params.status}
            summary={data?.summary}
            onSearch={(q) => update({ q, page: 1 })}
            onStatus={(status) => update({ status, page: 1 })}
          />
          {sel.size > 0 ? (
            <NeedBulkBar
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
            <NeedTable
              rows={rows}
              sel={sel}
              canAct={canAct}
              onToggle={toggle}
              onToggleAll={() => togglePage(rows.map((r) => r.id))}
              onHide={(id) => mod.hide([id])}
              onShow={(id) => mod.show([id])}
            />
          )}
          {list.isSuccess && rows.length === 0 ? (
            <div className={styles.empty}>{t('empty')}</div>
          ) : null}
          <NeedPager
            page={params.page}
            pages={pages}
            total={data?.total ?? 0}
            onPage={(page) => update({ page })}
          />
        </div>
      </div>
    </>
  );
}
