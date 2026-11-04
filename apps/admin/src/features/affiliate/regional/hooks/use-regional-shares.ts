'use client';
import { useInfiniteQuery, useQuery, keepPreviousData } from '@tanstack/react-query';
import type { RegionalRegion } from '@opchub/shared/api-domains';
import {
  regionalShareKey,
  fetchRegionalShares,
  fetchRegionalSharePage,
  fetchRegionalPayoutHistory,
} from '../share-api';
export const useRegionalShares = (q: string) =>
  useQuery({
    queryKey: [...regionalShareKey, q],
    queryFn: () => fetchRegionalShares(q),
    placeholderData: keepPreviousData,
  });
export function useRegionalShareItems(region: RegionalRegion) {
  return useInfiniteQuery({
    queryKey: [...regionalShareKey, 'items', region],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => fetchRegionalSharePage(region, pageParam),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
}
export const useRegionalPayoutHistory = (region: RegionalRegion) =>
  useQuery({
    queryKey: [...regionalShareKey, 'history', region],
    queryFn: () => fetchRegionalPayoutHistory(region),
  });
