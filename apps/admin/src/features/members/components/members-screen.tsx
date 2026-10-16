'use client';

import { Icon, PageHeader, Pagination } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useMembersScreen } from '../hooks/use-members-screen';
import { PAGE_SIZES } from '../types';
import { MemberBulkBar } from './member-bulk-bar';
import { MemberDialogs } from './member-dialogs';
import { MemberGrid } from './member-grid';
import { MemberTable } from './member-table';
import { MembersToolbar } from './members-toolbar';
import styles from './members-screen.module.css';

/** D-07 → D-17 Thành viên: orchestrator — bố cục + nối trạng thái với các phần con */
export function MembersScreen() {
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
        extra={
          <div className={styles.range}>
            <Icon name="calendar" stroke="rgba(0,0,0,0.65)" />
            {t('dateRange')}
            <Icon name="chevronDown" size={14} stroke="rgba(0,0,0,0.45)" />
          </div>
        }
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
        <MemberBulkBar
          count={s.selected.size}
          canEdit={s.can.edit}
          onAssign={() => h.assign(ids)}
          onLock={bulk(() => act.setStatusBulk(ids, 'locked'))}
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
