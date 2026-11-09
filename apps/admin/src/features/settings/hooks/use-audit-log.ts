'use client';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AuditLogFilters } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { useToast } from '@opchub/ui';
import { ApiError } from '@/lib/api-client';
import { useExportJob } from '@/lib/use-export-job';
import { fetchAuditLog, fetchAuditLogActors, exportAuditLog, settingsKeys } from '../api';
import { useAuditLogFilters } from './use-audit-log-filters';

export function useAuditLog() {
  const client = useQueryClient();
  const { filters, setFilters } = useAuditLogFilters();
  const changeFilters = (next: AuditLogFilters) => {
    // Revisiting a previously used filter must not restore its old infinite-page cursor.
    client.removeQueries({ queryKey: [...settingsKeys.log, next], exact: true });
    setFilters(next);
  };
  const actors = useQuery({
    queryKey: [...settingsKeys.log, 'actors'],
    queryFn: fetchAuditLogActors,
  });
  const run = useExportJob(),
    toast = useToast(),
    t = useTranslations('settings.log');
  const query = useInfiniteQuery({
    queryKey: [...settingsKeys.log, filters],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => fetchAuditLog(pageParam, filters),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
  const csv = useMutation({
    mutationFn: async () => {
      const job = await exportAuditLog(filters);
      const result = await run(job.jobId, 'nhat-ky-hoat-dong.csv');
      if (result.kind !== 'done')
        throw new Error(result.kind === 'error' ? result.message : t('failed'));
      return result;
    },
    onSuccess: (result) => toast(t('exported', { n: result.rows })),
    onError: (error) => toast(error instanceof ApiError ? error.message : t('failed')),
  });
  return {
    query,
    csv,
    filters,
    setFilters: changeFilters,
    actors,
    rows: query.data?.pages.flatMap((page) => page.items) ?? [],
  };
}
