'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { setSessionEndNavigator } from './session-end';

/**
 * Admin chưa có socket: phiên kết thúc phát hiện qua REST (403 khoá, đổi vai trò — api-client).
 * Shell đăng ký `router.replace` để về `/login?reason=` không tải lại trang.
 */
export function useSessionEndNavigator(): void {
  const router = useRouter();
  useEffect(() => {
    setSessionEndNavigator((href) => router.replace(href));
    return () => setSessionEndNavigator(null);
  }, [router]);
}
