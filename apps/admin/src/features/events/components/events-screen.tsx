'use client';

import {
  DateRangePicker,
  ErrorState,
  PageHeader,
  PageSkeleton,
  Pagination,
  useToast,
} from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { env } from '@/lib/env';
import { useAdminEvents } from '../hooks/use-events';
import { useEventsParams } from '../hooks/use-events-params';
import { eventStats, filterEvents, pageSlice } from '../model';
import { PAGE_SIZES, type EventView } from '../types';
import { EventForm, type EventFormTarget } from './event-form';
import { EventGrid, type EventActions } from './event-grid';
import { EventTable } from './event-table';
import styles from './events.module.css';
import { EventStatsRow, EventsToolbar } from './events-toolbar';
import { RegistrantsDrawer } from './registrants-drawer';
import { UpcomingBlock } from './upcoming-block';
import { useAdminUiLabels } from '@/i18n/ui-labels';

/** Link công khai của sự kiện bên User Portal (D-39: chi tiết sự kiện có URL) */
const shareUrl = (e: EventView) =>
  `${env.NEXT_PUBLIC_PORTAL_URL.replace(/\/$/, '')}/events/${encodeURIComponent(e.id)}`;

/** Sao chép vào clipboard; trình duyệt chặn thì vẫn báo như prototype */
async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // clipboard có thể bị chặn (http, quyền) — không có thao tác thay thế
  }
}

/** D-42 → D-50: Admin "Nội dung & Sự kiện" (orchestrator) */
export function EventsScreen() {
  const ui = useAdminUiLabels();
  const t = useTranslations('events');
  const toast = useToast();
  const { params, update } = useEventsParams();
  const events = useAdminEvents();
  const [form, setForm] = useState<EventFormTarget>(null);
  const [regsId, setRegsId] = useState<string | null>(null);

  const all = useMemo(() => events.data ?? [], [events.data]);
  const list = useMemo(() => filterEvents(all, params), [all, params]);
  const stats = useMemo(() => eventStats(all), [all]);
  const { page, items } = pageSlice(list, params.page, params.size);
  const regsEvent = all.find((e) => e.id === regsId) ?? null;

  const actions: EventActions = {
    onList: (e) => setRegsId(e.id),
    onEdit: (e) => setForm(e),
    onShare: (e) => {
      void copy(shareUrl(e));
      toast(t('toast.shared'));
    },
  };
  const onCreate = () => setForm('new');

  let body;
  if (events.isError)
    body = (
      <ErrorState
        title={t('loadError')}
        retryLabel={t('retry')}
        onRetry={() => void events.refetch()}
      />
    );
  else if (!events.data) body = <PageSkeleton />;
  else
    body = (
      <>
        {params.view === 'list' ? (
          <EventTable items={items} actions={actions} />
        ) : (
          <EventGrid items={items} actions={actions} onCreate={onCreate} />
        )}
        {list.length === 0 ? <div className={styles.empty}>{t('empty')}</div> : null}
        <Pagination
          page={page}
          size={params.size}
          total={list.length}
          sizeOptions={[...PAGE_SIZES]}
          onChange={(n) => update({ page: n })}
          onSizeChange={(size) => update({ size, page: 1 })}
          labels={{ ...ui.pagination, unit: t('pager.unit'), pageSize: t('pager.pageSize') }}
        />
      </>
    );

  return (
    <>
      <PageHeader
        title={t('title')}
        subtitle={t('sub')}
        extra={<DateRangePicker {...ui.dateRange} />}
      />
      <div data-screen-label="Admin · Nội dung & Sự kiện" className={styles.screen}>
        <EventStatsRow s={stats} />
        <UpcomingBlock onOpen={setRegsId} />
        <EventsToolbar params={params} onChange={update} onCreate={onCreate} />
        {body}
      </div>
      <RegistrantsDrawer event={regsEvent} onClose={() => setRegsId(null)} />
      <EventForm target={form} onClose={() => setForm(null)} />
    </>
  );
}
