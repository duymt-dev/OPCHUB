'use client';

import { useUrlParams } from '@/lib/use-url-params';
import { z } from 'zod';
import {
  COMMUNITY_FILTERS,
  COMMUNITY_SORTS,
  DEFAULT_PAGE_SIZE,
  PAGE_SIZES,
  type CommunityParams,
} from '../types';

/** Trạng thái lọc/trang của màn Cộng đồng nằm trên URL (data-state.md) */
const paramsSchema = z.object({
  q: z.string().catch(''),
  filter: z.enum(COMMUNITY_FILTERS).catch('all'),
  region: z.string().min(1).catch('all'),
  sort: z.enum(COMMUNITY_SORTS).catch('members'),
  page: z.coerce.number().int().min(1).catch(1),
  size: z.coerce
    .number()
    .int()
    .refine((n) => (PAGE_SIZES as readonly number[]).includes(n))
    .catch(DEFAULT_PAGE_SIZE),
  /** BUG-026: `/community?join=<id>` (rail chat) mở form tham gia nhóm đó */
  join: z.string().min(1).optional().catch(undefined),
});

export function useCommunityParams() {
  return useUrlParams<CommunityParams>(paramsSchema);
}
