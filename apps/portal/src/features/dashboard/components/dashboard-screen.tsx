'use client';

import { ErrorState, Icon, PageHeader, PageSkeleton } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useDashboardLive, useNow } from '../hooks/use-dashboard-live';
import { useDashboardParams } from '../hooks/use-dashboard-params';
import { countByStatus, monthRange } from '../model';
import { ActivityFeed } from './activity-feed';
import { CountryList } from './country-list';
import styles from './dashboard.module.css';
import { LiveGrid } from './live-grid';
import { LiveHero } from './live-hero';
import { OnlineStrip } from './online-strip';
import { DaySessions, LatestMessages } from './side-panels';
import { ThreadList } from './thread-list';

/** P-01 → P-06: Dashboard "LIVE hoạt động cộng đồng" — chỉ điều phối các khối */
export function DashboardScreen() {
  const t = useTranslations('dashboard.page');
  const tState = useTranslations('common.state');
  const router = useRouter();
  const live = useDashboardLive();
  const now = useNow();
  const { params, update } = useDashboardParams();
  const [picked, setPicked] = useState<string>();

  const header = (
    <PageHeader
      title={t('title')}
      subtitle={t('sub')}
      extra={
        <div className={styles.dateRange}>
          <Icon name="calendar" stroke="rgba(0,0,0,0.65)" />
          {live.data ? monthRange(live.data.generatedAt) : '—'}
          <Icon name="chevronDown" size={14} stroke="rgba(0,0,0,0.45)" />
        </div>
      }
    />
  );

  if (live.isError)
    return (
      <>
        {header}
        <ErrorState
          title={tState('error')}
          retryLabel={tState('retry')}
          onRetry={() => void live.refetch()}
        />
      </>
    );
  if (!live.data)
    return (
      <>
        {header}
        <PageSkeleton />
      </>
    );

  const data = live.data;
  const counts = countByStatus(data.members);
  const selectedId = picked ?? data.members[0]?.id ?? '';

  return (
    <>
      {header}
      <div className={styles.screen}>
        <LiveHero data={data} now={now} chatting={counts.chat} atEvent={counts.event} />
        <OnlineStrip online={data.stats.online} members={data.members} onPick={setPicked} />
        <div className={styles.columns}>
          <div className={styles.colLeft}>
            <ActivityFeed items={data.activities} now={now} />
            <CountryList countries={data.countries} total={data.stats.totalMembers} />
          </div>
          <div className={styles.colMain}>
            <LiveGrid
              members={data.members}
              now={now}
              selectedId={selectedId}
              params={params}
              onParams={update}
              onPick={setPicked}
            />
          </div>
          <div className={styles.colRight}>
            <LatestMessages items={data.messages} today={data.stats.messagesToday} now={now} />
            <DaySessions items={data.sessions} />
          </div>
        </div>
        <ThreadList items={data.threads} now={now} onJoin={(g) => router.push(`/chat/${g}`)} />
      </div>
    </>
  );
}
