'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { env } from '@/lib/env';
import { refreshSession } from '@/lib/session';

/**
 * Chưa có phiên trong bộ nhớ (tải lại trang) → thử POST /v1/auth/refresh bằng cookie một lần;
 * vẫn không có → /login?next=… . Khi đang dùng MSW thì bỏ bước refresh (không có cookie thật).
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const me = useAuthStore((s) => s.me);
  const signedOut = useAuthStore((s) => s.signedOut);
  const router = useRouter();
  const pathname = usePathname();
  const [tried, setTried] = useState(env.NEXT_PUBLIC_API_MOCKING === 'msw');

  useEffect(() => {
    if (me || signedOut || tried) return;
    let alive = true;
    void refreshSession().finally(() => {
      if (alive) setTried(true);
    });
    return () => {
      alive = false;
    };
  }, [me, signedOut, tried]);

  useEffect(() => {
    if (!me && !signedOut && tried) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [me, signedOut, tried, pathname, router]);

  return me ? children : null;
}
