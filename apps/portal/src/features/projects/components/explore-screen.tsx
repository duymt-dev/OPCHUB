'use client';

import type { ProjectCard } from '@opchub/shared/api-domains';
import { ErrorState, Pagination, PageSkeleton } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { useFollow } from '../hooks/use-project-actions';
import { useExploreParams } from '../hooks/use-project-params';
import { useMyProjects, useProjectList, useProjectStats } from '../hooks/use-projects';
import { EXPLORE_PAGE_SIZE } from '../types';
import { ExploreStats, FeaturedCard } from './explore-top';
import { ExploreToolbar } from './explore-toolbar';
import styles from './explore.module.css';
import { ProjectGrid, ProjectTable } from './project-list';
import { useProjectsUi } from './projects-context';
import { ScopeTabs } from './projects-header';

/** P-55 → P-59: Khám phá dự án (orchestrator) */
export function ExploreScreen() {
  const t = useTranslations('projects');
  const tState = useTranslations('common.state');
  const router = useRouter();
  const ui = useProjectsUi();
  const { params, update } = useExploreParams();
  const filter = useMemo(
    () => ({ q: params.q, cat: params.cat, stage: params.stage, sort: params.sort }),
    [params.q, params.cat, params.stage, params.sort],
  );
  const stats = useProjectStats();
  const list = useProjectList(filter);
  const mine = useMyProjects();
  const follow = useFollow();

  if (stats.isError || list.isError)
    return (
      <ErrorState
        title={tState('error')}
        retryLabel={tState('retry')}
        onRetry={() => void Promise.all([stats.refetch(), list.refetch()])}
      />
    );
  if (!stats.data || !list.data) return <PageSkeleton />;

  const s = stats.data;
  const items = list.data.items;
  const pages = Math.max(1, Math.ceil(items.length / EXPLORE_PAGE_SIZE));
  const page = Math.min(params.page, pages);
  const shown = items.slice((page - 1) * EXPLORE_PAGE_SIZE, page * EXPLORE_PAGE_SIZE);
  const colors = new Map(s.categories.map((c) => [c.name, c.color]));
  const colorOf = (c: string) => colors.get(c) ?? '#8C8C8C';
  const open = (p: { id: string }) => router.push(`/projects/${encodeURIComponent(p.id)}`);
  const onFollow = (p: ProjectCard) => follow.mutate(p);

  return (
    <div className={styles.screen}>
      <ScopeTabs
        active="explore"
        exploreCount={s.total}
        mineCount={mine.data?.length ?? 0}
        onScope={(k) => k === 'mine' && router.push('/projects/mine')}
        onNew={ui.openNew}
      />
      <ExploreStats stats={s} />
      {s.featured ? (
        <FeaturedCard p={s.featured} onOpen={() => open(s.featured ?? { id: '' })} />
      ) : null}
      <ExploreToolbar
        params={params}
        categories={s.categories}
        total={s.total}
        shown={items.length}
        onChange={update}
      />
      {items.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyTitle}>{t('empty.title')}</span>
          <button
            type="button"
            className={styles.ghostBtn}
            onClick={() => update({ q: '', cat: 'all', stage: 'all', page: 1 })}
          >
            {t('empty.reset')}
          </button>
        </div>
      ) : params.view === 'table' ? (
        <ProjectTable items={shown} onOpen={open} onFollow={onFollow} />
      ) : (
        <ProjectGrid items={shown} colorOf={colorOf} onOpen={open} />
      )}
      {items.length > EXPLORE_PAGE_SIZE ? (
        <Pagination
          page={page}
          size={EXPLORE_PAGE_SIZE}
          total={items.length}
          onChange={(p) => update({ page: p })}
          labels={{ unit: t('table.project').toLowerCase() }}
        />
      ) : null}
    </div>
  );
}
