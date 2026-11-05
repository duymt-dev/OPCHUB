'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { fetchGlobalSearch } from '../api';

/** Query-key isolation prevents late responses replacing a newer search or account. */
export function useGlobalSearch() {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const permissions = useAuthStore((s) => s.me?.permissions.join(','));
  const userId = useAuthStore((s) => s.me?.id);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query]);
  const result = useQuery({
    queryKey: ['global-search', userId, permissions, debounced],
    queryFn: () => fetchGlobalSearch(debounced),
    enabled: !!userId && debounced.length >= 2,
    staleTime: 30_000,
    placeholderData: (previous, previousQuery) =>
      previousQuery &&
      previousQuery.queryKey[1] === userId &&
      previousQuery.queryKey[2] === permissions
        ? keepPreviousData(previous)
        : undefined,
    retry: false,
  });
  const forbidden =
    result.error instanceof ApiError && [401, 402, 403].includes(result.error.status);
  return {
    onQuery: setQuery,
    open: query.trim().length >= 2 && !forbidden,
    groups: result.isError ? [] : (result.data?.groups ?? []),
  };
}
