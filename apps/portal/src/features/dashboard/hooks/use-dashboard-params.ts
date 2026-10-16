'use client';

import { useUrlParams } from '@/lib/use-url-params';
import { z } from 'zod';
import { DEFAULT_LIVE_SIZE, LIVE_FILTERS, LIVE_PAGE_SIZES, type DashboardParams } from '../types';

/** Lọc LIVE + trang nằm trên URL: `/dashboard?live=chat&page=2&size=8` (data-state.md) */
const paramsSchema = z.object({
  live: z.enum(LIVE_FILTERS).catch('all'),
  page: z.coerce.number().int().min(1).catch(1),
  size: z.coerce
    .number()
    .int()
    .refine((n) => (LIVE_PAGE_SIZES as readonly number[]).includes(n))
    .catch(DEFAULT_LIVE_SIZE),
});

export function useDashboardParams() {
  return useUrlParams<DashboardParams>(paramsSchema);
}
