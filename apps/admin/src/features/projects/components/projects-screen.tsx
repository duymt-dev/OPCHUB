'use client';

import { ConfirmDialog, DateRangePicker, ErrorState, PageHeader, PageSkeleton } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { useProjectActions } from '../hooks/use-project-actions';
import { useAdminProjects } from '../hooks/use-projects';
import { useProjectsParams } from '../hooks/use-projects-params';
import { useReviewRoute } from '../hooks/use-review-route';
import { inTab, tabCounts } from '../model';
import { ProjectListPanel } from './project-list-panel';
import { ProjectsHead, ReviewTabs } from './projects-head';
import styles from './projects.module.css';
import { ReviewDrawer } from './review-drawer';

/** D-51 → D-57: Admin "Dự án" — Kiểm duyệt dự án (orchestrator) */
export function ProjectsScreen() {
  const t = useTranslations('projects');
  const { params, update } = useProjectsParams();
  const route = useReviewRoute();
  const list = useAdminProjects();
  const a = useProjectActions(route.close);
  const all = useMemo(() => list.data ?? [], [list.data]);
  const counts = useMemo(() => tabCounts(all), [all]);
  const rows = useMemo(() => all.filter((p) => inTab(p, params.tab)), [all, params.tab]);
  const reviewing = all.find((p) => p.id === route.reviewId) ?? null;

  let body;
  if (list.isError)
    body = (
      <ErrorState
        title={t('loadError')}
        retryLabel={t('retry')}
        onRetry={() => void list.refetch()}
      />
    );
  else if (!list.data) body = <PageSkeleton />;
  else
    body = (
      <ProjectListPanel
        key={`${params.tab}|${params.view}|${params.page}|${params.size}`}
        rows={rows}
        params={params}
        onChange={update}
        onBulk={a.bulkAction}
        actions={{
          onOpen: (p) => route.open(p.id),
          onDelete: a.remove,
          onFundraising: a.fundraising,
        }}
      />
    );

  return (
    <>
      <PageHeader title={t('title')} subtitle={t('sub')} extra={<DateRangePicker />} />
      <div data-screen-label="Admin · Dự án" className={styles.card}>
        <ProjectsHead view={params.view} onView={(view) => update({ view })} />
        <ReviewTabs
          active={params.tab}
          counts={counts}
          onChange={(tab) => update({ tab, page: 1 })}
        />
        {body}
      </div>
      <ReviewDrawer project={reviewing} busy={a.busy} onClose={route.close} h={a} />
      <ConfirmDialog req={a.confirm} busy={a.busy} onClose={a.closeConfirm} />
    </>
  );
}
