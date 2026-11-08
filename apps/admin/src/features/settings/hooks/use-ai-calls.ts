'use client';
import { useState } from 'react';
import { useInfiniteQuery, useMutation } from '@tanstack/react-query';
import {
  aiCallsFilterSchema,
  aiCallsPageSchema,
  exportJobSchema,
  type AiCallsFilter,
} from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { api } from '@/lib/api-client';
import { useExportJob } from '@/lib/use-export-job';

export function useAiCalls() {
  const [filters, setFilters] = useState<AiCallsFilter>(() => aiCallsFilterSchema.parse({}));
  const toast = useToast();
  const run = useExportJob();
  const query = useInfiniteQuery({
    queryKey: ['admin-settings', 'ai-calls', filters],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => {
      const qs = new URLSearchParams(
        Object.entries(filters).flatMap(([key, value]) => (value ? [[key, value]] : [])),
      );
      if (pageParam) qs.set('cursor', pageParam);
      return api(`/admin/settings/ai/calls?${qs.toString()}`, { schema: aiCallsPageSchema });
    },
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
  const csv = useMutation({
    mutationFn: async () => {
      const job = await api('/admin/settings/ai/calls/export', {
        method: 'POST',
        body: filters,
        schema: exportJobSchema,
      });
      const result = await run(job.jobId, 'nhat-ky-goi-ai.csv');
      if (result.kind !== 'done') throw Error('export failed');
      return result;
    },
    onSuccess: (result) => toast(`Đã xuất ${result.rows} lời gọi AI`),
    onError: () => toast('Không xuất được nhật ký, vui lòng thử lại'),
  });
  const update = (next: AiCallsFilter) => {
    const parsed = aiCallsFilterSchema.safeParse(next);
    if (!parsed.success) {
      toast('Khoảng ngày phải từ 0 đến 90 ngày');
      return;
    }
    setFilters(parsed.data);
  };
  return {
    query,
    filters,
    update,
    csv,
    rows: query.data?.pages.flatMap((page) => page.items) ?? [],
    totals: query.data?.pages[0]?.totals,
  };
}
