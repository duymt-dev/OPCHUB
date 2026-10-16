import { notifyManager, QueryClient } from '@tanstack/react-query';
import { ApiError } from './api-client';

/** Báo kết quả query qua microtask thay vì setTimeout(0) — không phụ thuộc đồng hồ (parity dừng giờ) */
notifyManager.setScheduler(queueMicrotask);

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (count, err) => !(err instanceof ApiError && err.status < 500) && count < 1,
      },
    },
  });
}
