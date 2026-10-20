'use client';

import { SidebarEvents, toSidebarEvent } from '@opchub/ui';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCan } from '@/lib/permissions';
import { fetchUpcoming, shellKeys } from '../api';

/**
 * Ver2 — "Sự kiện sắp tới" ở chân sidebar: 3 sự kiện gần nhất từ `GET /admin/events/upcoming`.
 * Chỉ tải khi có `events.view` (luật 4); vai trò không có quyền thì ẩn khối (DV-V2-307-3).
 */
export function ShellEvents() {
  const t = useTranslations('common.shell');
  const router = useRouter();
  const allowed = useCan('events.view');
  const q = useQuery({ queryKey: shellKeys.upcoming, queryFn: fetchUpcoming, enabled: allowed });
  if (!allowed) return null;
  const d = q.data;
  const items = (d ? [...(d.next ? [d.next] : []), ...d.more] : []).slice(0, 3);
  return (
    <SidebarEvents
      title={t('upcoming')}
      allLabel={t('viewAll')}
      items={items.map(toSidebarEvent)}
      onAll={() => router.push('/events')}
      onOpen={() => router.push('/events')}
    />
  );
}
