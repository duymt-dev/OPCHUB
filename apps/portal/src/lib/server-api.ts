import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { storePublicPageSchema } from '@opchub/shared/api-domains';
import { env, portalServerEnv } from './env';

/** A single request-scoped fetch serves both metadata and HTML. No session cookie is forwarded. */
export const fetchPublicStore = cache(async (slug: string) => {
  if (env.NEXT_PUBLIC_API_MOCKING === 'msw') {
    const { mockStorePublicPage, STORE_PUBLIC_COOKIE, STORE_BRIDGE_COOKIE } =
      await import('@opchub/shared/mock-domains');
    const jar = await cookies();
    const result = mockStorePublicPage(
      slug,
      jar.get(STORE_PUBLIC_COOKIE)?.value,
      jar.get(STORE_BRIDGE_COOKIE)?.value,
    );
    return result.ok ? storePublicPageSchema.parse(result.data) : null;
  }
  const server = portalServerEnv();
  const response = await fetch(
    `${server.API_INTERNAL_URL}/public/stores/${encodeURIComponent(slug)}`,
    {
      // No Next data cache: API owns the bounded 60s cache and write invalidation.
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    },
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Public store is temporarily unavailable');
  return storePublicPageSchema.parse(await response.json());
});
