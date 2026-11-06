'use client';
import { useInfiniteQuery, useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useToast } from '@opchub/ui';
import { ApiError } from '@/lib/api-client';
import { useExportJob } from '@/lib/use-export-job';
import { fetchAuditLog, exportAuditLog, settingsKeys } from '../api';

export function useAuditLog() {
  const run = useExportJob(),
    toast = useToast(),
    t = useTranslations('settings.log');
  const query = useInfiniteQuery({
    queryKey: settingsKeys.log,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => fetchAuditLog(pageParam),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
  const csv = useMutation({
    mutationFn: async () => {
      const job = await exportAuditLog();
      const result = await run(job.jobId, 'nhat-ky-hoat-dong.csv');
      if (result.kind !== 'done')
        throw new Error(result.kind === 'error' ? result.message : t('failed'));
      return result;
    },
    onSuccess: (result) => toast(t('exported', { n: result.rows })),
    onError: (error) => toast(error instanceof ApiError ? error.message : t('failed')),
  });
  return { query, csv, rows: query.data?.pages.flatMap((page) => page.items) ?? [] };
}
