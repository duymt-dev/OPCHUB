'use client';

import { ADMIN_NEED_FILTERS } from '@opchub/shared/api-domains';
import { z } from 'zod';
import { useUrlParams } from '@/lib/use-url-params';
import type { NeedParams } from '../types';

/** Lọc trạng thái, tìm, trang của Admin › Nhu cầu nằm trên URL (data-state.md) */
const paramsSchema = z.object({
  q: z.string().catch(''),
  status: z.enum(ADMIN_NEED_FILTERS).catch('all'),
  page: z.coerce.number().int().min(1).catch(1),
});

export function useNeedParams() {
  return useUrlParams<NeedParams>(paramsSchema);
}
