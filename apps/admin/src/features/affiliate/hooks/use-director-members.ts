'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { directorKeys, fetchDirectorMembers } from '../regional-directors-api';
import { useAffiliateAccess } from './use-affiliate-access';

export function useDirectorMembers(search: string, open: boolean) {
  const access = useAffiliateAccess();
  const [q, setQ] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setQ(search.trim().slice(0, 100)), 300);
    return () => clearTimeout(timer);
  }, [search]);
  return useInfiniteQuery({
    queryKey: directorKeys.members(q),
    initialPageParam: 1,
    queryFn: ({ pageParam }) => fetchDirectorMembers(q, pageParam),
    getNextPageParam: (page) => (page.page * page.size < page.total ? page.page + 1 : undefined),
    enabled: open && access.view && access.director && q.length > 0,
  });
}
