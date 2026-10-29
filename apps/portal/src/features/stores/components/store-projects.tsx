'use client';

import type { StoreDetail } from '@opchub/shared/api-domains';
import { ErrorState, PageSkeleton } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { openStoreProject, useStoreProjects } from '@/features/projects';
import { CardIcon } from './card-icon';
import styles from './store-projects.module.css';

export function StoreProjects({ store }: { store: StoreDetail }) {
  const t = useTranslations('stores.projects');
  const state = useTranslations('common.state');
  const stage = useTranslations('projects.stage');
  const q = useStoreProjects(store.id);
  const router = useRouter();
  const projects = q.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <section className={styles.card} data-block="store-projects">
      <div className={styles.head}>
        <CardIcon d="M3 7h18v13H3zM8 7V4h8v3M3 12h18" />
        <span className={styles.title}>{t('title')}</span>
        {store.isMine ? (
          <button
            type="button"
            className={styles.create}
            onClick={() => {
              openStoreProject(store);
              router.push('/projects', { scroll: false });
            }}
          >
            {t('create')}
          </button>
        ) : null}
      </div>
      {q.isError ? (
        <ErrorState
          title={state('error')}
          retryLabel={state('retry')}
          onRetry={() => void q.refetch()}
        />
      ) : q.isPending ? (
        <PageSkeleton />
      ) : (
        <>
          {!projects.length ? <p className={styles.empty}>{t('empty')}</p> : null}
          <div className={styles.grid}>
            {projects.map((p) => (
              <Link key={p.id} className={styles.project} href={`/projects/${p.id}`}>
                <span className={styles.category}>
                  {p.category} · {stage(p.stage)}
                </span>
                <span className={styles.name}>{p.name}</span>
                <span className={styles.summary}>{p.summary}</span>
                <span className={styles.view}>{t('view')}</span>
              </Link>
            ))}
          </div>
          {q.hasNextPage ? (
            <button
              type="button"
              className={styles.more}
              disabled={q.isFetchingNextPage}
              onClick={() => void q.fetchNextPage()}
            >
              {t('more')}
            </button>
          ) : null}
        </>
      )}
    </section>
  );
}
