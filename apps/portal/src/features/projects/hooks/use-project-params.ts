'use client';

import { PROJECT_SORTS, PROJECT_STAGE_FILTERS } from '@opchub/shared/api-domains';
import { z } from 'zod';
import { useUrlParams } from '@/lib/use-url-params';
import { DETAIL_TABS, type DetailParams, type ExploreParams } from '../types';

/** Trạng thái lọc/trang/chế độ xem của Khám phá trên URL (data-state.md) */
const exploreSchema = z.object({
  q: z.string().catch(''),
  cat: z.string().min(1).catch('all'),
  stage: z.enum([...PROJECT_STAGE_FILTERS, 'all']).catch('all'),
  sort: z.enum(PROJECT_SORTS).catch('new'),
  view: z.enum(['grid', 'table']).catch('grid'),
  page: z.coerce.number().int().min(1).catch(1),
});

export const useExploreParams = () => useUrlParams<ExploreParams>(exploreSchema);

/** Tab chi tiết + sắp xếp/lọc góp ý trên URL (`?tab=feedback&csort=top`) */
const detailSchema = z.object({
  tab: z.enum(DETAIL_TABS).catch('overview'),
  csort: z.enum(['new', 'top']).catch('new'),
  ctype: z.enum(['all', 'feedback', 'question', 'partnership']).catch('all'),
});

export const useDetailParams = () => useUrlParams<DetailParams>(detailSchema);
