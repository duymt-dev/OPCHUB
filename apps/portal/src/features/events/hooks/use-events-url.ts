'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';
import { useUrlParams } from '@/lib/use-url-params';
import { EVENT_FILTERS, type EventsParams } from '../types';

const paramsSchema = z.object({
  q: z.string().catch(''),
  filter: z.enum(EVENT_FILTERS).catch('all'),
});

/**
 * Lọc/tìm trên query (`?filter=&q=`), sự kiện đang xem trên path `/events/:id` (D-39).
 * Mở/đóng chi tiết dùng history API (Next đồng bộ usePathname, không tải lại màn).
 */
export function useEventsUrl() {
  const { params, update } = useUrlParams<EventsParams>(paramsSchema);
  const pathname = usePathname();
  const [, , raw] = pathname.split('/');
  const openId = raw ? decodeURIComponent(raw) : null;

  const go = useCallback((id: string | null) => {
    const path = id ? `/events/${encodeURIComponent(id)}` : '/events';
    window.history.pushState(null, '', `${path}${window.location.search}`);
  }, []);

  return { params, update, openId, open: go, close: () => go(null) };
}

/** Giờ hiện tại, cập nhật mỗi giây (đếm ngược sự kiện nổi bật) */
export function useNowTick(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}
