'use client';

import { useToast } from '@opchub/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { fetchAdminMe } from '@/features/auth';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';

/**
 * Lưới an toàn RB-R07 / NA-28: thao tác bị server từ chối vì quyền (`VIEW_ONLY`, `FORBIDDEN`) →
 * toast đúng câu server và tải lại `/admin/auth/me` — ma trận vừa đổi áp ngay cho menu/nút.
 */
export function useRbacErrors(): void {
  const qc = useQueryClient();
  const toast = useToast();
  const setMe = useAuthStore((s) => s.setMe);
  useEffect(() => {
    const refreshMe = () =>
      void fetchAdminMe()
        .then(setMe)
        .catch(() => undefined);
    const isRbac = (e: unknown) =>
      e instanceof ApiError && (e.code === 'VIEW_ONLY' || e.code === 'FORBIDDEN');
    const offM = qc.getMutationCache().subscribe((ev) => {
      if (ev.type !== 'updated' || ev.action.type !== 'error') return;
      const e: unknown = ev.action.error;
      if (!isRbac(e)) return;
      if (e instanceof ApiError && e.code === 'VIEW_ONLY') toast(e.message);
      refreshMe();
    });
    const offQ = qc.getQueryCache().subscribe((ev) => {
      if (ev.type === 'updated' && ev.action.type === 'error' && isRbac(ev.action.error)) {
        refreshMe();
      }
    });
    // NA-28: lấy lại quyền khi quay lại tab (phiên đang mở nhận ma trận mới không cần đăng nhập lại)
    const onFocus = () => document.visibilityState === 'visible' && refreshMe();
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      offM();
      offQ();
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [qc, toast, setMe]);
}
