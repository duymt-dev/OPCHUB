import { env } from '@/lib/env';
import { setMockReady } from '@/lib/mock-ready';

/**
 * Chạy duy nhất ở trình duyệt, trước khi app hydrate.
 * msw/browser không có bản node nên không được import ở component (SSR sẽ vỡ).
 */
if (env.NEXT_PUBLIC_API_MOCKING === 'msw') {
  setMockReady(
    import('@/mocks/browser').then(({ worker }) =>
      worker.start({ onUnhandledFrame: 'bypass', quiet: true }).then(() => undefined),
    ),
  );
}
