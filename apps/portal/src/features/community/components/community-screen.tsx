'use client';

import { ErrorState, PageSkeleton } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo } from 'react';
import { useCommunityActions } from '../hooks/use-community-actions';
import { useCommunityParams } from '../hooks/use-community-params';
import { useGroups } from '../hooks/use-groups';
import { useJoinParam } from '../hooks/use-join-param';
import { filterGroups, regionCounts } from '../model';
import { CommunityIntro, CommunityPageHeader } from './community-header';
import { CommunityList } from './community-list';
import { CommunityToolbar } from './community-toolbar';
import styles from './community.module.css';
import { JoinModal } from './join-modal';

/** P-17 → P-27: Khám phá cộng đồng (orchestrator) */
export function CommunityScreen() {
  const t = useTranslations('common.state');
  const { params, update } = useCommunityParams();
  const groups = useGroups();
  const actions = useCommunityActions();
  const all = useMemo(() => groups.data ?? [], [groups.data]);
  const list = useMemo(() => filterGroups(all, params), [all, params]);
  const clear = useCallback(() => update({ join: undefined }), [update]);
  const { joining, handlers } = actions;
  useJoinParam({ join: params.join, groups: groups.data, joining, open: handlers.onJoin, clear });

  if (groups.isError)
    return (
      <ErrorState
        title={t('error')}
        retryLabel={t('retry')}
        onRetry={() => void groups.refetch()}
      />
    );
  if (!groups.data) return <PageSkeleton />;

  return (
    <>
      <CommunityPageHeader />
      <div className={styles.screen}>
        <CommunityIntro joined={all.filter((g) => g.joined).length} total={all.length} />
        <CommunityToolbar
          params={params}
          regions={regionCounts(all)}
          shown={list.length}
          total={all.length}
          onChange={update}
        />
        <CommunityList
          list={list}
          page={params.page}
          size={params.size}
          handlers={actions.handlers}
          onPage={(page) => update({ page })}
          onSize={(size) => update({ size, page: 1 })}
          onReset={() => update({ q: '', region: 'all', filter: 'all', page: 1 })}
        />
        <JoinModal
          group={actions.joining}
          busy={actions.busy}
          onClose={actions.closeJoin}
          onSubmit={actions.submitJoin}
          onInvalid={actions.toast}
        />
      </div>
    </>
  );
}
