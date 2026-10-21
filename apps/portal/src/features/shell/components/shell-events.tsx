'use client';

import { SidebarEvents, toSidebarEvent } from '@opchub/ui';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { eventDay } from '@/i18n/format';
import { fetchUpcomingEvents, shellKeys } from '../api';

/** Ver2 — "Sự kiện sắp tới" ở chân sidebar: 3 sự kiện gần nhất, bấm → chi tiết (D-39) */
export function ShellEvents() {
  const t = useTranslations('common.shell');
  const tMode = useTranslations('events.mode');
  const router = useRouter();
  const q = useQuery({ queryKey: shellKeys.events, queryFn: fetchUpcomingEvents });
  // D-65: thứ + hình thức theo ngôn ngữ (server gửi "T5, 22/10")
  const items = (q.data?.items ?? []).slice(0, 3).map((e) => {
    const d = eventDay(e.startsAt, e.day);
    const row = toSidebarEvent({ ...e, day: d.day });
    return { ...row, dow: d.dow, dnum: d.dnum, meta: `${d.day} · ${e.time} · ${tMode(e.mode)}` };
  });
  return (
    <SidebarEvents
      title={t('upcoming')}
      allLabel={t('viewAll')}
      items={items}
      onAll={() => router.push('/events')}
      onOpen={(id) => router.push(`/events/${encodeURIComponent(id)}`)}
    />
  );
}
