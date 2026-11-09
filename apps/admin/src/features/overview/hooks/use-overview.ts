'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { AdminOverviewQuery } from '@opchub/shared/api-domains';
import { usePageVisible } from '@/lib/use-page-visible';
import { fetchOverview, overviewKeys } from '../data';
import { useOverviewUrl } from './use-overview-url';

/** NA-24: đang xem Tổng quan + tab hiện → làm mới 3 giây (server cache 60 giây, S-03) */
const TICK_MS = 3_000;

export function useOverview() {
  const visible = usePageVisible();
  const { params } = useOverviewUrl();
  const query = useMemo<AdminOverviewQuery>(
    () => ({
      ...(params.from ? { from: params.from } : {}),
      ...(params.to ? { to: params.to } : {}),
      period: params.period,
    }),
    [params.from, params.to, params.period],
  );

  return useQuery({
    queryKey: overviewKeys.list(query),
    queryFn: () => fetchOverview(query),
    refetchInterval: visible ? TICK_MS : false,
    refetchIntervalInBackground: false,
  });
}
