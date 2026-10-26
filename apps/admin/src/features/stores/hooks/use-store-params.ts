'use client';

import { ADMIN_STORE_FILTERS } from '@opchub/shared/api-domains';
import { z } from 'zod';
import { useUrlParams } from '@/lib/use-url-params';
import type { StoreParams } from '../types';

/** Lọc trạng thái, tìm, trang của Admin › Gian hàng nằm trên URL (data-state.md) */
const paramsSchema = z.object({
  q: z.string().catch(''),
  status: z.enum(ADMIN_STORE_FILTERS).catch('all'),
  page: z.coerce.number().int().min(1).catch(1),
});

export function useStoreParams() {
  return useUrlParams<StoreParams>(paramsSchema);
}
