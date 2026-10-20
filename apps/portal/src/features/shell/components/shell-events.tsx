'use client';

import { SidebarEvents, toSidebarEvent } from '@opchub/ui';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { fetchUpcomingEvents, shellKeys } from '../api';

/** Ver2 — "Sự kiện sắp tới" ở chân sidebar: 3 sự kiện gần nhất, bấm → chi tiết (D-39) */
export function ShellEvents() {
  const t = useTranslations('common.shell');
  const router = useRouter();
  const q = useQuery({ queryKey: shellKeys.events, queryFn: fetchUpcomingEvents });
  const items = (q.data?.items ?? []).slice(0, 3).map(toSidebarEvent);
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
