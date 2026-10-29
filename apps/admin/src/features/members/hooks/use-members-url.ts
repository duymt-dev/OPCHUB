'use client';

import { useCallback } from 'react';
import { z } from 'zod';
import { useUrlParams } from '@/lib/use-url-params';
import {
  DEFAULT_PAGE_SIZE,
  MEMBER_DAY_FILTERS,
  MEMBER_FEE_FILTERS,
  MEMBER_PROFILE_FILTERS,
  MEMBER_ROLE_FILTERS,
  MEMBER_STATUS_FILTERS,
  MEMBER_TYPE_FILTERS,
  MEMBER_VIEWS,
  type MemberFilters,
  type MembersParams,
} from '../types';

const paramsSchema = z.object({
  view: z.enum(MEMBER_VIEWS).catch('list'),
  type: z.enum(MEMBER_TYPE_FILTERS).catch('all'),
  q: z.string().catch(''),
  grp: z.string().max(64).catch(''),
  role: z.enum(MEMBER_ROLE_FILTERS).catch(''),
  fee: z.enum(MEMBER_FEE_FILTERS).catch(''),
  st: z.enum(MEMBER_STATUS_FILTERS).catch(''),
  prof: z.enum(MEMBER_PROFILE_FILTERS).catch(''),
  day: z.enum(MEMBER_DAY_FILTERS).catch(''),
  page: z.coerce.number().int().min(1).catch(1),
  size: z.coerce.number().int().min(1).max(100).catch(DEFAULT_PAGE_SIZE),
});

/** `?view=grid&type=business&q=&fee=paid&page=2&size=6` — đổi lọc / cỡ trang thì về trang 1 */
export function useMembersUrl() {
  const { params, update } = useUrlParams<MembersParams>(paramsSchema);
  const setFilter = useCallback(
    (patch: Partial<Pick<MembersParams, 'type' | 'q' | 'size' | keyof MemberFilters>>) =>
      update({ ...patch, page: 1 }),
    [update],
  );
  return { params, update, setFilter };
}
