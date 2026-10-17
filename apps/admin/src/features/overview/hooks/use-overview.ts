'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchOverview, overviewKeys } from '../data';

export function useOverview() {
  return useQuery({ queryKey: overviewKeys.all, queryFn: fetchOverview, staleTime: 60_000 });
}
