'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchStoreProjects, projectKeys } from '../api';

export function useStoreProjects(storeId: string) {
  return useInfiniteQuery({
    queryKey: [...projectKeys.all, 'store', storeId],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => fetchStoreProjects(storeId, pageParam),
    getNextPageParam: (last) => (last.page * last.size < last.total ? last.page + 1 : undefined),
  });
}
