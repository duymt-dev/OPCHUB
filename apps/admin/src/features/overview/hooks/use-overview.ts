'use client';

import { useQuery } from '@tanstack/react-query';
import { usePageVisible } from '@/lib/use-page-visible';
import { fetchOverview, overviewKeys } from '../data';

/** NA-24: đang xem Tổng quan + tab hiện → làm mới 3 giây (server cache 60 giây, S-03) */
const TICK_MS = 3_000;

export function useOverview() {
  const visible = usePageVisible();
  return useQuery({
    queryKey: overviewKeys.all,
    queryFn: fetchOverview,
    refetchInterval: visible ? TICK_MS : false,
    refetchIntervalInBackground: false,
  });
}
