import { createMockAffiliateBridge } from '@opchub/shared/mock-affiliate-browser';
import { http, HttpResponse, type HttpHandler } from 'msw/http';
import { env } from '@/lib/env';

/** The Portal relay origin must match NEXT_PUBLIC_PORTAL_URL in the MSW build. */
export function bridgedAffiliateHandlers(handlers: readonly HttpHandler[]) {
  const transact = createMockAffiliateBridge(env.NEXT_PUBLIC_PORTAL_URL);
  return [
    http.all('/v1/*', async ({ request, requestId }) => {
      try {
        return await transact(async () => {
          for (const handler of handlers) {
            const result = await handler.run({ request: request.clone(), requestId });
            if (result?.response) return result.response;
          }
          return undefined;
        });
      } catch {
        return HttpResponse.json(
          {
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Mock Affiliate state unavailable',
              requestId,
            },
          },
          { status: 503 },
        );
      }
    }),
  ];
}
