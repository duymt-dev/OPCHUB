'use client';

import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
  revenueKeys,
  fetchRevenueDashboard,
  fetchFormerRevenueDirectors,
  fetchRevenueLedger,
  fetchRevenueHistory,
  fetchRevenueMonths,
} from '../revenue-sharing-api';
import type { RevenueCursor } from '../revenue-types';
import { useAffiliateAccess } from './use-affiliate-access';

export function useRevenueSharing(showFormer: boolean, q: string) {
  const access = useAffiliateAccess();
  const dashboard = useQuery({
    queryKey: revenueKeys.dashboard(q),
    queryFn: () => fetchRevenueDashboard(q),
    placeholderData: keepPreviousData,
    enabled: access.view,
  });
  const former = useInfiniteQuery({
    queryKey: revenueKeys.former,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => fetchFormerRevenueDirectors(pageParam),
    getNextPageParam: (p) => p.nextCursor ?? undefined,
    enabled: access.view && showFormer,
  });
  return { dashboard, former, access };
}

export function useRevenueDetail(id: string) {
  const access = useAffiliateAccess();
  const ledger = useInfiniteQuery({
    queryKey: revenueKeys.ledger(id),
    initialPageParam: null as RevenueCursor,
    queryFn: ({ pageParam }) => fetchRevenueLedger(id, pageParam),
    getNextPageParam: (p) => p.nextCursor ?? undefined,
    enabled: access.view,
  });
  const history = useInfiniteQuery({
    queryKey: revenueKeys.history(id),
    initialPageParam: null as RevenueCursor,
    queryFn: ({ pageParam }) => fetchRevenueHistory(id, pageParam),
    getNextPageParam: (p) => p.nextCursor ?? undefined,
    enabled: access.view,
  });
  return { ledger, history };
}

export function useRevenueMonths(id: string) {
  const access = useAffiliateAccess();
  return useInfiniteQuery({
    queryKey: revenueKeys.months(id),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => fetchRevenueMonths(id, pageParam),
    getNextPageParam: (p) => p.nextCursor ?? undefined,
    enabled: access.view,
  });
}
