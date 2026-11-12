'use client';

import { DateRangePicker, PageHeader, Pagination } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useMembersScreen } from '../hooks/use-members-screen';
import { PAGE_SIZES } from '../types';
import { MemberBulkBar } from './member-bulk-bar';
import { MemberDialogs } from './member-dialogs';
import { MemberGrid } from './member-grid';
import { MemberTable } from './member-table';
import { MembersToolbar } from './members-toolbar';
import { MemberFiltersBar } from './member-filters';
import styles from './members-screen.module.css';
import { useAdminUiLabels } from '@/i18n/ui-labels';

/** D-07 → D-17 Thành viên: orchestrator — bố cục + nối trạng thái với các phần con */
export function MembersScreen() {
  const ui = useAdminUiLabels();
  const t = useTranslations('members');
  const s = useMembersScreen();
  const { params, act, h } = s;
  const ids = [...s.selected];
  const bulk = (fn: () => void) => () => (fn(), s.clear());

  return (
    <>
      <PageHeader
        title={t('title')}
        subtitle={t('sub')}
        extra={<DateRangePicker {...ui.dateRange} />}
      />
      <div data-screen-label="Admin · Thành viên" className={styles.card}>
        <MembersToolbar
          counts={s.list.data?.counts}
          view={params.view}
          type={params.type}
          q={params.q}
          onView={(view) => s.update({ view })}
          onType={(type) => s.setFilter({ type })}
          onSearch={(q) => s.setFilter({ q })}
        />
        <MemberFiltersBar
          value={params}
          groups={s.groups}
          total={s.list.data?.total ?? 0}
          onChange={s.setFilter}
        />
        <MemberBulkBar
          count={s.selected.size}
          canEdit={s.can.edit}
          onAssign={() => h.assign(ids)}
          onLock={() => s.lockBulk(ids)}
          onUnlock={bulk(() => act.setStatusBulk(ids, 'active'))}
          onExport={bulk(() => act.exportCsv(ids))}
          onClear={s.clear}
        />
        {params.view === 'list' ? (
          <MemberTable
            rows={s.rows}
            selected={s.selected}
            onToggleAll={s.toggleAll}
            groups={s.groups}
            h={h}
            can={s.can}
          />
        ) : (
          <MemberGrid rows={s.rows} selected={s.selected} groups={s.groups} h={h} can={s.can} />
        )}
        <Pagination
          page={params.page}
          size={params.size}
          total={s.list.data?.total ?? 0}
          sizeOptions={PAGE_SIZES}
          onChange={(page) => s.update({ page })}
          onSizeChange={(size) => s.setFilter({ size })}
          labels={{
            ...ui.pagination,
            unit: t('pager.unit'),
            prev: t('pager.prev'),
            next: t('pager.next'),
            pageSize: t('pager.pageSize'),
          }}
        />
      </div>
      <MemberDialogs s={s} />
    </>
  );
}
