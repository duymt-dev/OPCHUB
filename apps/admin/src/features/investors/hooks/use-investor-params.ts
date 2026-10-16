'use client';

import { z } from 'zod';
import { useUrlParams } from '@/lib/use-url-params';
import {
  INVESTOR_DEFAULT_SIZE,
  INVESTOR_PAGE_SIZES,
  INVESTOR_TABS,
  type InvestorParams,
} from '../types';

const SIZES: readonly number[] = [...INVESTOR_PAGE_SIZES, INVESTOR_DEFAULT_SIZE];

/** Tìm, tab loại, trang, cỡ trang của màn Nhà đầu tư nằm trên URL (data-state.md) */
const paramsSchema = z.object({
  q: z.string().catch(''),
  kind: z.enum(INVESTOR_TABS).catch('all'),
  page: z.coerce.number().int().min(1).catch(1),
  size: z.coerce
    .number()
    .int()
    .refine((n) => SIZES.includes(n))
    .catch(INVESTOR_DEFAULT_SIZE),
});

export function useInvestorParams() {
  return useUrlParams<InvestorParams>(paramsSchema);
}
