'use client';

import { PROJECT_AUDIENCE, PROJECT_NEEDS, PROJECT_STAGE } from '@opchub/shared';
import { PROJECT_SORTS } from '@opchub/shared/api-domains';
import { z } from 'zod';
import { useUrlParams } from '@/lib/use-url-params';
import { DETAIL_TABS, type DetailParams, type ExploreParams } from '../types';

/** `a,b` trên URL → mảng; giá trị lạ bị bỏ (nhập tay) */
const list = <T extends z.ZodType<string>>(item: T) =>
  z
    .string()
    .transform((s) => s.split(',').filter((v) => item.safeParse(v).success) as z.infer<T>[])
    .catch([]);

/** Trạng thái lọc/trang/chế độ xem của Khám phá trên URL (data-state.md) */
const exploreSchema = z.object({
  q: z.string().catch(''),
  cat: z.string().min(1).catch('all'),
  sort: z.enum(PROJECT_SORTS).catch('new'),
  view: z.enum(['grid', 'table']).catch('grid'),
  page: z.coerce.number().int().min(1).catch(1),
  size: z.coerce
    .number()
    .pipe(z.union([z.literal(8), z.literal(12), z.literal(24)]))
    .catch(12),
  who: z.enum([...PROJECT_AUDIENCE, 'all']).catch('all'),
  provs: list(z.string().min(1).max(60)),
  devs: list(z.enum(PROJECT_STAGE)),
  needs: list(z.enum(PROJECT_NEEDS)),
}) satisfies z.ZodType<ExploreParams, unknown>;

export const useExploreParams = () => useUrlParams<ExploreParams>(exploreSchema);

/** Tab chi tiết + sắp xếp/lọc góp ý trên URL (`?tab=feedback&csort=top`) */
const detailSchema = z.object({
  tab: z.enum(DETAIL_TABS).catch('overview'),
  csort: z.enum(['new', 'top']).catch('new'),
  ctype: z.enum(['all', 'feedback', 'question', 'partnership']).catch('all'),
});

export const useDetailParams = () => useUrlParams<DetailParams>(detailSchema);
