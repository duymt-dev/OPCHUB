'use client';

import { ErrorState, PageSkeleton } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ApiError } from '@/lib/api-client';
import { useFollow } from '../hooks/use-project-actions';
import { useDetailParams } from '../hooks/use-project-params';
import { useComments, useProject } from '../hooks/use-projects';
import { CommentsTab } from './comments-tab';
import { DetailHero } from './detail-hero';
import { InfoCard, OwnerCard, RelatedCard, RepoCard } from './detail-side';
import { OverviewTab, TeamTab, UpdatesTab } from './detail-tabs';
import styles from './detail.module.css';
import { FundingBox } from './funding-box';
import { InvestModal } from './invest-modal';

/** P-62 → P-72: Chi tiết dự án `/projects/[id]` (URL riêng — D-39), tab trên `?tab=` */
export function DetailScreen({ id }: { id: string }) {
  const t = useTranslations('projects.detail');
  const tState = useTranslations('common.state');
  const router = useRouter();
  const { params, update } = useDetailParams();
  const project = useProject(id);
  const comments = useComments(id);
  const follow = useFollow();
  const [investing, setInvesting] = useState(false);
  const back = () => router.push('/projects');

  if (project.isError) {
    const missing = project.error instanceof ApiError && project.error.status === 404;
    return missing ? (
      <div className={styles.notFound}>
        <b>{t('notFound')}</b>
        <button type="button" className={styles.outlineBtn} onClick={back}>
          {t('back')}
        </button>
      </div>
    ) : (
      <ErrorState
        title={tState('error')}
        retryLabel={tState('retry')}
        onRetry={() => void project.refetch()}
      />
    );
  }
  if (!project.data) return <PageSkeleton />;
  const p = project.data;
  const list = comments.data ?? [];

  return (
    <div className={styles.screen}>
      <DetailHero
        p={p}
        commentCount={comments.data ? list.length : p.commentCount}
        tab={params.tab}
        onTab={(tab) => update({ tab })}
        onFollow={() => follow.mutate(p)}
        onBack={back}
      />
      <div className={styles.body}>
        <div className={styles.mainCol}>
          {params.tab === 'overview' ? <OverviewTab p={p} /> : null}
          {params.tab === 'updates' ? <UpdatesTab p={p} /> : null}
          {params.tab === 'team' ? <TeamTab p={p} /> : null}
          {params.tab === 'feedback' ? (
            <CommentsTab
              p={p}
              comments={list}
              now={comments.dataUpdatedAt}
              params={params}
              onParams={update}
            />
          ) : null}
        </div>
        <div className={styles.sideCol}>
          <OwnerCard p={p} />
          <InfoCard p={p} />
          <RepoCard p={p} />
          <FundingBox p={p} onInterest={() => setInvesting(true)} />
          <RelatedCard
            p={p}
            onOpen={(rid) => router.push(`/projects/${encodeURIComponent(rid)}`)}
          />
        </div>
      </div>
      {investing ? <InvestModal p={p} onClose={() => setInvesting(false)} /> : null}
    </div>
  );
}
