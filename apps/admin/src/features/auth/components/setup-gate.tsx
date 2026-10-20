'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { refreshSession } from '@/lib/session';

/** Màn thiết lập (đổi MK lần đầu, 2FA) cần phiên — tải lại trang thì refresh bằng cookie một lần */
export function SetupGate({ children }: { children: ReactNode }) {
  const me = useAuthStore((s) => s.me);
  const router = useRouter();
  const [tried, setTried] = useState(false);
  useEffect(() => {
    if (me || tried) return;
    void refreshSession().finally(() => setTried(true));
  }, [me, tried]);
  useEffect(() => {
    if (!me && tried) router.replace('/login');
  }, [me, tried, router]);
  return me ? children : null;
}
