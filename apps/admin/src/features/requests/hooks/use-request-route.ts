'use client';

import { usePathname } from 'next/navigation';
import { useCallback } from 'react';
import { z } from 'zod';
import { useUrlParams } from '@/lib/use-url-params';
import {
  REQUEST_DEFAULT_SIZE,
  REQUEST_FILTERS,
  REQUEST_PAGE_SIZES,
  REQUEST_TAB_PATH,
  type RequestParams,
  type RequestTab,
} from '../types';

const SIZES: readonly number[] = [...REQUEST_PAGE_SIZES, REQUEST_DEFAULT_SIZE];

/** Lọc trạng thái, tìm, trang, cỡ trang nằm trên URL (data-state.md) */
const paramsSchema = z.object({
  q: z.string().catch(''),
  status: z.enum(REQUEST_FILTERS).catch('all'),
  page: z.coerce.number().int().min(1).catch(1),
  size: z.coerce
    .number()
    .int()
    .refine((n) => SIZES.includes(n))
    .catch(REQUEST_DEFAULT_SIZE),
});

/**
 * Tab "Yêu cầu đăng ký" (/requests) / "Danh mục dịch vụ" (/requests/catalog). Đổi tab bằng
 * history API của Next (đồng bộ usePathname, không tải lại RSC); nút Back vẫn đúng tab.
 */
export function useRequestRoute() {
  const pathname = usePathname();
  const tab: RequestTab = pathname.replace(/\/+$/, '').endsWith('/catalog') ? 'catalog' : 'list';
  const { params, update } = useUrlParams<RequestParams>(paramsSchema);
  const setTab = useCallback((t: RequestTab) => {
    const p = REQUEST_TAB_PATH[t];
    if (window.location.pathname !== p) window.history.pushState(null, '', p);
  }, []);
  return { tab, setTab, params, update };
}
