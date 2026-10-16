'use client';

import { z } from 'zod';
import { useUrlParams } from '@/lib/use-url-params';
import {
  DEFAULT_PAGE_SIZE,
  GROUP_SORTS,
  GROUP_TABS,
  GROUP_VIEWS,
  PAGE_SIZES,
  REPORT_FILTERS,
  type GroupsParams,
} from '../types';

/** Tab, kiểu xem, miền, tìm, sắp xếp, trang, lọc báo cáo — trên URL (data-state.md) */
const schema = z.object({
  tab: z.enum(GROUP_TABS).catch('list'),
  view: z.enum(GROUP_VIEWS).catch('grid'),
  region: z.string().min(1).catch('all'),
  q: z.string().catch(''),
  sort: z.enum(GROUP_SORTS).catch('members'),
  page: z.coerce.number().int().min(1).catch(1),
  size: z.coerce
    .number()
    .int()
    .refine((n) => (PAGE_SIZES as readonly number[]).includes(n))
    .catch(DEFAULT_PAGE_SIZE),
  rep: z.enum(REPORT_FILTERS).catch('all'),
});

export function useGroupsParams() {
  return useUrlParams<GroupsParams>(schema);
}
