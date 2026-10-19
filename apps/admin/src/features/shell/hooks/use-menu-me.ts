'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { fetchAdminMe } from '@/features/auth';
import { env } from '@/lib/env';
import { useAuthStore } from '@/lib/auth-store';

/**
 * NA-28 (TIP-V2-204 BR-6): mỗi lần chuyển menu tải lại `/admin/auth/me` — Super Admin vừa bỏ quyền
 * thì phiên đang mở mất menu ngay, không cần đăng nhập lại. Bỏ lần đầu (vừa đăng nhập/refresh).
 */
export function useMenuMe(): void {
  const pathname = usePathname();
  const setMe = useAuthStore((s) => s.setMe);
  const menu = pathname.split('/')[1] ?? '';
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (env.NEXT_PUBLIC_API_MOCKING === 'msw' && !menu) return;
    void fetchAdminMe()
      .then(setMe)
      .catch(() => undefined);
  }, [menu, setMe]);
}
