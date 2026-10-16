'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
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

const DEFAULTS: DashboardParams = paramsSchema.parse({});

export function useDashboardParams() {
  const search = useSearchParams();
  const pathname = usePathname();

  const params = useMemo(
    () =>
      paramsSchema.parse({
        live: search.get('live') ?? undefined,
        page: search.get('page') ?? undefined,
        size: search.get('size') ?? undefined,
      }),
    [search],
  );

  /** Cập nhật một phần; khóa ở giá trị mặc định thì bỏ khỏi URL */
  const update = useCallback(
    (patch: Partial<DashboardParams>) => {
      const next = { ...params, ...patch };
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(next)) {
        if (v !== DEFAULTS[k as keyof DashboardParams]) qs.set(k, String(v));
      }
      const s = qs.toString();
      window.history.replaceState(null, '', s ? `${pathname}?${s}` : pathname);
    },
    [params, pathname],
  );

  return { params, update };
}
