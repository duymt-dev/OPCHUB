'use client';

import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { botBulkKeys, fetchBotBulkItems, fetchLatestBotBulk } from '../bulk-api';

/** Recover the actor's durable draft on mount; never synthesize generation progress. */
export function useBotBulk() {
  const client = useQueryClient();
  const latest = useQuery({
    queryKey: botBulkKeys.latest(),
    queryFn: fetchLatestBotBulk,
    staleTime: 0,
    refetchInterval: (query) => (query.state.data?.batch?.status === 'running' ? 2000 : false),
  });
  const batch = latest.data?.batch ?? null;
  const id = batch?.id ?? null;
  const cursor = batch?.cursor;
  const items = useInfiniteQuery({
    queryKey: botBulkKeys.items(id),
    enabled: id !== null,
    initialPageParam: -1,
    queryFn: ({ pageParam }) => {
      if (!id) throw new Error('No bulk batch');
      return fetchBotBulkItems(id, pageParam);
    },
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    staleTime: 0,
  });
  useEffect(() => {
    if (id !== null) void client.invalidateQueries({ queryKey: botBulkKeys.items(id) });
  }, [client, id, cursor]);
  return { latest, batch, items, results: items.data?.pages.flatMap((page) => page.items) ?? [] };
}
