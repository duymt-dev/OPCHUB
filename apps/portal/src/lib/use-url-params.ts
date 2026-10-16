'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import type { z } from 'zod';

/**
 * Trạng thái lọc/trang trên URL (data-state.md). `schema` parse từng khóa có `.catch()`
 * nên giá trị rác rơi về mặc định. `update` đọc URL ngay lúc ghi — hai thao tác liền nhau
 * trước khi React render lại không ghi đè nhau. Khóa bằng mặc định thì bỏ khỏi URL.
 */
export function useUrlParams<T extends object>(schema: z.ZodType<T>) {
  const search = useSearchParams();
  const pathname = usePathname();
  const parse = useCallback(
    (q: Pick<URLSearchParams, 'entries'>) => schema.parse(Object.fromEntries(q.entries())),
    [schema],
  );
  const defaults = useMemo(() => schema.parse({}), [schema]);
  const params = useMemo(() => parse(search), [parse, search]);

  const update = useCallback(
    (patch: Partial<T>) => {
      const next = { ...parse(new URLSearchParams(window.location.search)), ...patch };
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(next)) {
        if (v !== (defaults as Record<string, unknown>)[k] && v !== '') qs.set(k, String(v));
      }
      const s = qs.toString();
      // history API của Next đồng bộ useSearchParams mà không tải lại trang
      window.history.replaceState(null, '', s ? `${pathname}?${s}` : pathname);
    },
    [defaults, parse, pathname],
  );

  return { params, update };
}
