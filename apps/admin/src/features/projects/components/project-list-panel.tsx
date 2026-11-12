'use client';

import type { ProjectBulkAction } from '@opchub/shared/api-domains';
import { BulkBar, Pagination } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useSelection } from '../hooks/use-selection';
import { pageSlice } from '../model';
import { PAGE_SIZES, type AdminProject, type ProjectsParams } from '../types';
import { ProjectGrid, type ProjectRowActions } from './project-grid';
import { ProjectTable } from './project-table';
import styles from './projects.module.css';
import { useAdminUiLabels } from '@/i18n/ui-labels';

interface Props {
  rows: AdminProject[];
  params: ProjectsParams;
  onChange: (patch: Partial<ProjectsParams>) => void;
  onBulk: (ids: string[], action: ProjectBulkAction, clear: () => void) => void;
  actions: ProjectRowActions;
}

/**
 * D-51 → D-54, D-57: lưới / bảng của tab hiện tại + chọn nhiều + phân trang.
 * Màn cha đặt `key` theo tab / kiểu xem / trang nên đổi phạm vi thì bỏ chọn.
 */
export function ProjectListPanel({ rows, params, onChange, onBulk, actions }: Props) {
  const ui = useAdminUiLabels();
  const t = useTranslations('projects');
  const { page, items } = pageSlice(rows, params.page, params.size);
  const { selected, picked, toggle, toggleAll, clear } = useSelection(items);
  const ids = picked.map((p) => p.id);

  const bulkBtn = (action: ProjectBulkAction, cls: string | undefined) => (
    <button type="button" className={cls} onClick={() => onBulk(ids, action, clear)}>
      {t(`bulk.${action}`)}
    </button>
  );

  return (
    <>
      <BulkBar
        {...ui.bulk}
        count={picked.length}
        unit={t('bulk.unit')}
        selectedLabel={t('bulk.selected')}
        clearLabel={t('bulk.clear')}
        ariaLabel={t('bulk.label')}
        onClear={clear}
        actions={
          <>
            {bulkBtn('publish', styles.bulkBlue)}
            {bulkBtn('hide', styles.bulkBtn)}
            {bulkBtn('delete', styles.bulkRed)}
          </>
        }
      />
      {rows.length > 0 && params.view === 'list' ? (
        <ProjectTable
          items={items}
          selected={selected}
          onToggle={toggle}
          onToggleAll={toggleAll}
          actions={actions}
        />
      ) : null}
      {rows.length > 0 && params.view === 'grid' ? (
        <ProjectGrid items={items} actions={actions} />
      ) : null}
      {rows.length === 0 ? (
        <div className={styles.empty}>
          {params.tab === 'pending' ? t('emptyPending') : t('empty')}
        </div>
      ) : null}
      <Pagination
        page={page}
        size={params.size}
        total={rows.length}
        sizeOptions={[...PAGE_SIZES]}
        onChange={(n) => onChange({ page: n })}
        onSizeChange={(size) => onChange({ size, page: 1 })}
        labels={{
          ...ui.pagination,
          unit: t('pager.unit'),
          prev: t('pager.prev'),
          next: t('pager.next'),
          pageSize: t('pager.pageSize'),
        }}
      />
    </>
  );
}
