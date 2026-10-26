'use client';

import { NEED_TYPES } from '@opchub/shared/api-domains';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { z } from 'zod';
import { useUrlParams } from '@/lib/use-url-params';
import { fetchMyNeeds, fetchNeeds, type NeedFilter, needKeys } from '../api';

/** Lọc "Tất cả nhu cầu" trên URL (data-state.md) — giá trị rác rơi về mặc định */
const needParamsSchema = z.object({
  q: z.string().catch(''),
  type: z.enum(['all', ...NEED_TYPES]).catch('all'),
  province: z.string().catch(''),
  field: z.string().catch(''),
  page: z.coerce.number().int().min(1).catch(1),
});
type UrlParams = z.infer<typeof needParamsSchema>;

export function useNeedParams() {
  const { params, update } = useUrlParams<UrlParams>(needParamsSchema);
  const filter = useMemo<NeedFilter>(
    () => ({
      q: params.q,
      page: params.page,
      ...(params.type === 'all' ? {} : { type: params.type }),
      ...(params.province ? { province: params.province } : {}),
      ...(params.field ? { field: params.field } : {}),
    }),
    [params],
  );
  return {
    filter,
    type: params.type,
    set: (patch: Partial<UrlParams>) => update({ page: 1, ...patch }),
    setPage: (page: number) => update({ page }),
  };
}

export const useNeedList = (f: NeedFilter) =>
  useQuery({
    queryKey: needKeys.list(f),
    queryFn: () => fetchNeeds(f),
    placeholderData: keepPreviousData,
  });

/** Nhu cầu của tôi — TK Doanh nghiệp (server 403 cho TK Cá nhân) */
export const useMyNeeds = (enabled: boolean) =>
  useQuery({ queryKey: needKeys.mine(), queryFn: fetchMyNeeds, enabled, retry: false });
