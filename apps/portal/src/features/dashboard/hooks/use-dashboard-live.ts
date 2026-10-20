'use client';

import type { DashboardLive } from '@opchub/shared/api-domains';
import { serverEvents } from '@opchub/shared/socket';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { getSocket, realtimeEnabled } from '@/lib/socket';
import { dashboardKeys, fetchDashboardLive } from '../api';

/** NA-24: chu kỳ 3 giây khi đang xem; tab ẩn thì dừng */
const TICK_MS = 3_000;

/** Tab đang hiện (`visibilitychange`) — SSR coi như hiện */
export function usePageVisible(): boolean {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const on = () => setVisible(document.visibilityState === 'visible');
    on();
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);
  return visible;
}

/**
 * Số liệu LIVE (NA-24, REQ-224): ảnh chụp đầy đủ `GET /dashboard/live`, rồi server đẩy
 * `metrics.updated` (bộ đếm + hoạt động trực tiếp) mỗi 3 giây qua room `metrics:portal` khi tab
 * hiện; ẩn tab / rời màn → `metrics.unsubscribe`. MSW không có socket → làm mới REST 3 giây.
 */
export function useDashboardLive() {
  const qc = useQueryClient();
  const visible = usePageVisible();
  const q = useQuery({
    queryKey: dashboardKeys.live(),
    queryFn: fetchDashboardLive,
    refetchInterval: !realtimeEnabled && visible ? TICK_MS : false,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    if (!realtimeEnabled || !visible) return undefined;
    const s = getSocket();
    const apply = (raw: unknown) => {
      const p = serverEvents['metrics.updated'].safeParse(raw);
      if (!p.success) return;
      qc.setQueryData<DashboardLive>(dashboardKeys.live(), (old) => old && { ...old, ...p.data });
    };
    const subscribe = () =>
      void s.emit('metrics.subscribe', { scope: 'portal' }, (ack: unknown) => {
        const r = ack as { ok?: boolean; data?: unknown };
        if (r.ok) apply(r.data);
      });
    subscribe();
    s.on('connect', subscribe);
    s.on('metrics.updated', apply);
    return () => {
      s.off('connect', subscribe);
      s.off('metrics.updated', apply);
      s.emit('metrics.unsubscribe', { scope: 'portal' });
    };
  }, [qc, visible]);

  return q;
}

/** Đồng hồ hero; nhịp 3 giây như bộ đếm của prototype */
export function useNow(intervalMs = 3_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
