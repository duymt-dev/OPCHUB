'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
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
});

const DEFAULTS: CommunityParams = paramsSchema.parse({});

export function useCommunityParams() {
  const search = useSearchParams();
  const pathname = usePathname();

  const params = useMemo(
    () =>
      paramsSchema.parse({
        q: search.get('q') ?? undefined,
        filter: search.get('filter') ?? undefined,
        region: search.get('region') ?? undefined,
        sort: search.get('sort') ?? undefined,
        page: search.get('page') ?? undefined,
        size: search.get('size') ?? undefined,
      }),
    [search],
  );

  /** Cập nhật một phần; bỏ khóa đang ở giá trị mặc định cho URL gọn */
  const update = useCallback(
    (patch: Partial<CommunityParams>) => {
      const next = { ...params, ...patch };
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(next)) {
        if (v !== DEFAULTS[k as keyof CommunityParams] && v !== '') qs.set(k, String(v));
      }
      const s = qs.toString();
      // history API của Next đồng bộ useSearchParams mà không tải lại trang
      window.history.replaceState(null, '', s ? `${pathname}?${s}` : pathname);
    },
    [params, pathname],
  );

  return { params, update };
}
