'use client';

import { ErrorState, PageSkeleton } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useStoreExploreParams } from '../hooks/use-explore-params';
import { useStoreList } from '../hooks/use-stores';
import { CategoryTiles, ExploreHero } from './explore-hero';
import { ExploreFilters } from './explore-filters';
import { ExploreResults } from './explore-results';
import styles from './explore.module.css';
import base from './stores.module.css';
import { StoreTabs } from './store-tabs';

/** P-105 / P-106: Khám phá gian hàng (orchestrator) — lọc / trang trên URL */
export function StoreExploreScreen() {
  const tState = useTranslations('common.state');
  const p = useStoreExploreParams();
  const list = useStoreList(p.filter);
  const { audience, field, province } = p.filter;

  const body = list.isError ? (
    <ErrorState
      title={tState('error')}
      retryLabel={tState('retry')}
      onRetry={() => void list.refetch()}
    />
  ) : !list.data ? (
    <PageSkeleton />
  ) : (
    <div className={styles.layout}>
      <ExploreFilters
        facets={list.data.facets}
        kind={p.kind}
        selected={{ audience, field, province }}
        onKind={(kind) => p.set({ kind })}
        onToggle={p.toggle}
        onReset={p.reset}
      />
      <ExploreResults
        data={list.data}
        sort={p.filter.sort}
        onSort={(sort) => p.set({ sort })}
        onPage={p.setPage}
      />
    </div>
  );

  return (
    <div className={base.screen} data-screen="stores-explore">
      <StoreTabs active="explore" />
      <ExploreHero q={p.filter.q} onSearch={(q) => p.set({ q })} />
      <CategoryTiles selected={field} onPick={p.pickField} />
      {body}
    </div>
  );
}
