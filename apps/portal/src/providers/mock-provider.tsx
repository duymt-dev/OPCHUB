'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { env } from '@/lib/env';
import { mockReady } from '@/lib/mock-ready';

const mocking = env.NEXT_PUBLIC_API_MOCKING === 'msw';

/** Chờ MSW sẵn sàng (khởi động ở instrumentation-client) để request đầu tiên đã được chặn */
export function MockProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!mocking);

  useEffect(() => {
    if (mocking) void mockReady().then(() => setReady(true));
  }, []);

  return ready ? children : null;
}
