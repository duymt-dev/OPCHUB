'use client';

import { useCallback } from 'react';
import { z } from 'zod';
import { useUrlParams } from '@/lib/use-url-params';
import {
  DEFAULT_PAGE_SIZE,
  MEMBER_ONB_FILTERS,
  MEMBER_TYPE_FILTERS,
  MEMBER_VIEWS,
  type MembersParams,
} from '../types';

const paramsSchema = z.object({
  view: z.enum(MEMBER_VIEWS).catch('list'),
  type: z.enum(MEMBER_TYPE_FILTERS).catch('all'),
  q: z.string().catch(''),
  onb: z.enum(MEMBER_ONB_FILTERS).catch('all'),
  page: z.coerce.number().int().min(1).catch(1),
  size: z.coerce.number().int().min(1).max(100).catch(DEFAULT_PAGE_SIZE),
});

/** `?view=grid&type=business&q=&onb=todo&page=2&size=6` — đổi lọc / cỡ trang thì về trang 1 */
export function useMembersUrl() {
  const { params, update } = useUrlParams<MembersParams>(paramsSchema);
  const setFilter = useCallback(
    (patch: Partial<Pick<MembersParams, 'type' | 'q' | 'onb' | 'size'>>) =>
      update({ ...patch, page: 1 }),
    [update],
  );
  return { params, update, setFilter };
}
