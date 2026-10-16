'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useAuthStore } from '@/lib/auth-store';

/**
 * Chưa đăng nhập → /login?next=… . Chưa có backend nên chưa gọi refresh;
 * khi nối API thật: gọi POST /v1/auth/refresh trước khi quyết định.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const me = useAuthStore((s) => s.me);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!me) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [me, pathname, router]);

  return me ? children : null;
}
