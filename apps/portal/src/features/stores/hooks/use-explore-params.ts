'use client';

import {
  STORE_AUDIENCES,
  STORE_ITEM_KINDS,
  STORE_SORTS,
  type StoreAudience,
} from '@opchub/shared/api-domains';
import { useMemo } from 'react';
import { z } from 'zod';
import { useUrlParams } from '@/lib/use-url-params';
import type { ExploreFilter } from '../api';

/** Lọc Khám phá trên URL (data-state.md); chọn nhiều lưu dạng `a,b` để link chia sẻ được */
const exploreSchema = z.object({
  q: z.string().catch(''),
  kind: z.enum(['all', ...STORE_ITEM_KINDS]).catch('all'),
  audience: z.string().catch(''),
  field: z.string().catch(''),
  province: z.string().catch(''),
  sort: z.enum(STORE_SORTS).catch('newest'),
  page: z.coerce.number().int().min(1).catch(1),
});

type UrlParams = z.infer<typeof exploreSchema>;
export type MultiKey = 'audience' | 'field' | 'province';

const split = (v: string) => (v ? v.split(',').filter(Boolean) : []);
const AUD = new Set<string>(STORE_AUDIENCES);

export function useStoreExploreParams() {
  const { params, update } = useUrlParams<UrlParams>(exploreSchema);
  const filter = useMemo<ExploreFilter>(
    () => ({
      q: params.q,
      ...(params.kind === 'all' ? {} : { kind: params.kind }),
      audience: split(params.audience).filter((a): a is StoreAudience => AUD.has(a)),
      field: split(params.field),
      province: split(params.province),
      sort: params.sort,
      page: params.page,
    }),
    [params],
  );
  const set = (patch: Partial<UrlParams>) => update({ page: 1, ...patch });
  return {
    filter,
    kind: params.kind,
    set,
    setPage: (page: number) => update({ page }),
    /** Bật / tắt 1 lựa chọn của nhóm chọn nhiều */
    toggle: (key: MultiKey, v: string) => {
      const cur: string[] = filter[key];
      set({ [key]: (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]).join(',') });
    },
    /** Ô danh mục: chỉ chọn đúng 1 ngành (hoặc bỏ hết) như prototype */
    pickField: (v: string | null) => set({ field: v ?? '' }),
    reset: () => set({ q: '', kind: 'all', audience: '', field: '', province: '' }),
  };
}
