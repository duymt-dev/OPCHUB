'use client';

import type { ProjectCard } from '@opchub/shared/api-domains';
import { ErrorState, PageSkeleton } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { applySide, badgeOf, sideCounts, topProvinces } from '../explore-model';
import { useFollow } from '../hooks/use-project-actions';
import { useExploreParams } from '../hooks/use-project-params';
import { useMyProjects, useProjectList, useProjectStats } from '../hooks/use-projects';
import { ExploreCats } from './explore-cats';
import { ExploreHero } from './explore-hero';
import { Pager, ResultBar } from './explore-results';
import { ExploreSide } from './explore-side';
import styles from './explore.module.css';
import { ProjectGridCard } from './project-card';
import cardStyles from './project-card.module.css';
import { ProjectTable } from './project-list';
import type { ExploreParams } from '../types';
import { useProjectsUi } from './projects-context';
import { ScopeTabs } from './projects-header';

const CLEAR: Partial<ExploreParams> = {
  q: '',
  cat: 'all',
  who: 'all',
  provs: [],
  devs: [],
  needs: [],
  page: 1,
};

interface ResultsProps {
  params: ExploreParams;
  items: ProjectCard[];
  update: (patch: Partial<ExploreParams>) => void;
}

/** Thanh kết quả + lưới thẻ / bảng / trống + phân trang (cột phải) */
function Results({ params, items, update }: ResultsProps) {
  const t = useTranslations('projects');
  const router = useRouter();
  const follow = useFollow();
  const pages = Math.max(1, Math.ceil(items.length / params.size));
  const page = Math.min(params.page, pages);
  const shown = items.slice((page - 1) * params.size, page * params.size);
  const plain =
    page === 1 &&
    params.sort === 'new' &&
    params.cat === 'all' &&
    params.who === 'all' &&
    !params.q;
  const open = (p: { id: string }) => router.push(`/projects/${encodeURIComponent(p.id)}`);
  const onFollow = (p: ProjectCard) => follow.mutate(p);
  return (
    <div className={styles.main}>
      <ResultBar params={params} count={items.length} onChange={update} />
      {items.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyTitle}>{t('empty.title')}</span>
          <button type="button" className={styles.ghostBtn} onClick={() => update(CLEAR)}>
            {t('empty.reset')}
          </button>
        </div>
      ) : params.view === 'table' ? (
        <ProjectTable items={shown} onOpen={open} onFollow={onFollow} />
      ) : (
        <div className={cardStyles.grid}>
          {shown.map((p, i) => (
            <ProjectGridCard
              key={p.id}
              p={p}
              badge={badgeOf(p, i, plain)}
              onOpen={() => open(p)}
              onFollow={() => onFollow(p)}
            />
          ))}
        </div>
      )}
      <Pager page={page} pages={pages} onPage={(p) => update({ page: p })} />
    </div>
  );
}

/** P-55 → P-59: Khám phá dự án v4 (orchestrator) — tìm ở API, bộ lọc trái lọc tại chỗ như prototype */
export function ExploreScreen() {
  const tState = useTranslations('common.state');
  const router = useRouter();
  const ui = useProjectsUi();
  const { params, update } = useExploreParams();
  const filter = useMemo(() => ({ q: params.q, sort: params.sort }), [params.q, params.sort]);
  const stats = useProjectStats();
  const all = useProjectList({ q: '', sort: 'new' });
  const list = useProjectList(filter);
  const mine = useMyProjects();

  if (stats.isError || list.isError || all.isError)
    return (
      <ErrorState
        title={tState('error')}
        retryLabel={tState('retry')}
        onRetry={() => void Promise.all([stats.refetch(), list.refetch(), all.refetch()])}
      />
    );
  if (!stats.data || !list.data || !all.data) return <PageSkeleton />;

  const s = stats.data;
  const base = list.data.items;
  return (
    <div className={styles.screen}>
      <ScopeTabs
        active="explore"
        exploreCount={s.total}
        mineCount={mine.data?.length ?? 0}
        onScope={(k) => k === 'mine' && router.push('/projects/mine')}
        onNew={ui.openNew}
      />
      <ExploreHero stats={s} q={params.q} onQ={(q) => update({ q, page: 1 })} onNew={ui.openNew} />
      <ExploreCats
        categories={s.categories}
        total={s.total}
        active={params.cat}
        onPick={(cat) => update({ cat, page: 1 })}
      />
      <div className={styles.body}>
        <ExploreSide
          params={params}
          counts={sideCounts(base, all.data.items)}
          top={topProvinces(all.data.items)}
          onChange={update}
          onReset={() => update(CLEAR)}
        />
        <Results params={params} items={applySide(base, params)} update={update} />
      </div>
    </div>
  );
}
