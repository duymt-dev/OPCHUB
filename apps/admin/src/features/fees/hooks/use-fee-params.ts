'use client';

import { z } from 'zod';
import { useUrlParams } from '@/lib/use-url-params';
import { FEE_DEFAULT_SIZE, FEE_PAGE_SIZES, FEE_TABS, type FeeParams } from '../types';

const SIZES: readonly number[] = [...FEE_PAGE_SIZES, FEE_DEFAULT_SIZE];

/** Tìm, tab trạng thái, trang, cỡ trang của màn Phí thành viên nằm trên URL (data-state.md) */
const paramsSchema = z.object({
  q: z.string().catch(''),
  status: z.enum(FEE_TABS).catch('all'),
  page: z.coerce.number().int().min(1).catch(1),
  size: z.coerce
    .number()
    .int()
    .refine((n) => SIZES.includes(n))
    .catch(FEE_DEFAULT_SIZE),
});

export function useFeeParams() {
  return useUrlParams<FeeParams>(paramsSchema);
}
