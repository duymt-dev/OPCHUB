'use client';

import { BulkBar, Pagination } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { useSelection } from '../hooks/use-selection';
import { filterGroups, groupStats, pageSlice } from '../model';
import { PAGE_SIZES, type AdminGroup, type GroupsParams } from '../types';
import { GroupGrid, type GroupRowActions } from './group-grid';
import { GroupTable } from './group-table';
import { GroupsFilters, GroupsHead, GroupsStats } from './groups-toolbar';
import styles from './groups.module.css';

interface Props {
  all: AdminGroup[];
  params: GroupsParams;
  onChange: (patch: Partial<GroupsParams>) => void;
  onCreate: () => void;
  onExport: (ids: string[]) => void;
  onDeleteMany: (groups: AdminGroup[], done: () => void) => void;
  actions: GroupRowActions;
}

/** D-23 → D-27: tab "Danh sách nhóm" — thống kê, lọc, lưới / bảng, chọn nhiều, phân trang */
export function GroupListPanel(p: Props) {
  const t = useTranslations('groups.list');
  const { params } = p;
  const list = useMemo(() => filterGroups(p.all, params), [p.all, params]);
  const { page, items } = pageSlice(list, params.page, params.size);
  const stats = useMemo(() => groupStats(p.all), [p.all]);
  const { selected, picked, toggle, toggleAll, clear } = useSelection(items);

  return (
    <div className={styles.card}>
      <GroupsHead
        view={params.view}
        onCreate={p.onCreate}
        onExport={() => p.onExport(p.all.map((g) => g.id))}
        onView={(view) => p.onChange({ view })}
      />
      <GroupsStats s={stats} />
      <GroupsFilters all={p.all} params={params} onChange={p.onChange} />
      {params.view === 'list' ? (
        <BulkBar
          count={picked.length}
          unit={t('unit')}
          selectedLabel={t('selected')}
          clearLabel={t('clear')}
          ariaLabel={t('bulkLabel')}
          onClear={clear}
          actions={
            <>
              <button
                type="button"
                className={styles.bulkDanger}
                onClick={() => p.onDeleteMany(picked, clear)}
              >
                {t('bulkDelete')}
              </button>
              <button
                type="button"
                className={styles.bulkBtn}
                onClick={() => {
                  p.onExport(picked.map((g) => g.id));
                  clear();
                }}
              >
                {t('bulkExport')}
              </button>
            </>
          }
        />
      ) : null}
      {list.length === 0 ? <div className={styles.empty}>{t('empty')}</div> : null}
      {params.view === 'list' ? (
        <GroupTable
          items={items}
          selected={selected}
          onToggle={toggle}
          onToggleAll={toggleAll}
          actions={p.actions}
        />
      ) : (
        <GroupGrid items={items} actions={p.actions} />
      )}
      <Pagination
        page={page}
        size={params.size}
        total={list.length}
        sizeOptions={[...PAGE_SIZES]}
        onChange={(n) => p.onChange({ page: n })}
        onSizeChange={(size) => p.onChange({ size, page: 1 })}
        labels={{ unit: t('pageUnit'), pageSize: t('pageSize') }}
      />
    </div>
  );
}
