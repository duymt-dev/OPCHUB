'use client';

import { useQuery } from '@tanstack/react-query';
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
    retry: false,
  });
  const forbidden =
    result.error instanceof ApiError && [401, 402, 403].includes(result.error.status);
  return {
    onQuery: setQuery,
    loading: query.trim() !== debounced || result.isPending,
    failed: query.trim() === debounced && result.isError,
    open: query.trim().length >= 2 && !forbidden,
    groups: query.trim() !== debounced || result.isError ? [] : (result.data?.groups ?? []),
  };
}
