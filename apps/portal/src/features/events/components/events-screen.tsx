'use client';

import { ErrorState, Icon, PageHeader, PageSkeleton } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { useEvents, useToggleRegistration } from '../hooks/use-events';
import { useEventsUrl } from '../hooks/use-events-url';
import { filterEvents } from '../model';
import type { EventView } from '../types';
import { EventCard } from './event-card';
import { EventDetailModal } from './event-detail-modal';
import { EventHero } from './event-hero';
import styles from './events.module.css';
import { EventsToolbar } from './events-toolbar';

function EventsHeader() {
  const t = useTranslations('events.page');
  return (
    <PageHeader
      title={t('title')}
      subtitle={t('sub')}
      extra={
        <div className={styles.dateRange}>
          <Icon name="calendar" stroke="rgba(0,0,0,0.65)" />
          {t('dateRange')}
          <Icon name="chevronDown" size={14} stroke="rgba(0,0,0,0.45)" />
        </div>
      }
    />
  );
}

/** P-49 → P-54: Sự kiện sắp tới (orchestrator) — chi tiết ở `/events/:id` */
export function EventsScreen() {
  const t = useTranslations('events');
  const tState = useTranslations('common.state');
  const events = useEvents();
  const toggle = useToggleRegistration();
  const url = useEventsUrl();
  const all = useMemo(() => events.data ?? [], [events.data]);
  const list = useMemo(() => filterEvents(all, url.params), [all, url.params]);

  if (events.isError)
    return (
      <ErrorState
        title={tState('error')}
        retryLabel={tState('retry')}
        onRetry={() => void events.refetch()}
      />
    );
  if (!events.data) return <PageSkeleton />;

  const featured = all[0];
  const open = all.find((e) => e.id === url.openId) ?? null;
  const onOpen = (e: EventView) => url.open(e.id);

  return (
    <>
      <EventsHeader />
      <div className={styles.screen}>
        {featured ? <EventHero e={featured} onOpen={onOpen} onToggle={toggle} /> : null}
        <EventsToolbar
          params={url.params}
          shown={list.length}
          total={all.length}
          onChange={url.update}
        />
        {list.length ? (
          <div className={styles.grid}>
            {list.map((e) => (
              <EventCard key={e.id} e={e} onOpen={onOpen} onToggle={toggle} />
            ))}
          </div>
        ) : (
          <div className={styles.empty}>{t('empty')}</div>
        )}
      </div>
      {open ? <EventDetailModal e={open} onClose={url.close} onToggle={toggle} /> : null}
    </>
  );
}
