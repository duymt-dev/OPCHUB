'use client';

import { usePathname } from 'next/navigation';
import { useCallback } from 'react';
import { parseReviewId, reviewPath } from '../route';

/**
 * Drawer duyệt nằm trên URL `/projects/:id/review` (screens.md D-55). Đổi bằng history API
 * của Next (đồng bộ usePathname, không tải lại RSC), giữ query tab/kiểu xem/trang.
 */
export function useReviewRoute() {
  const pathname = usePathname();
  const reviewId = parseReviewId(pathname) ?? null;

  const go = useCallback((id: string | null) => {
    const path = reviewPath(id);
    if (window.location.pathname === path) return;
    window.history.pushState(null, '', `${path}${window.location.search}`);
  }, []);

  return {
    reviewId,
    open: (id: string) => go(id),
    close: useCallback(() => go(null), [go]),
  };
}
