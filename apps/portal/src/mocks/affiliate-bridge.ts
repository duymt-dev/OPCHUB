import { createMockAffiliateBridge } from '@opchub/shared/mock-affiliate-browser';
import { http, HttpResponse, type HttpHandler } from 'msw/http';

/** Browser-only adapter. Handler tests keep using the ordinary in-memory backend. */
export function bridgedAffiliateHandlers(handlers: readonly HttpHandler[]) {
  const transact = createMockAffiliateBridge(location.origin);
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
