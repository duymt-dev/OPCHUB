import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { storePublicPageSchema, storeSitemapPageSchema } from '@opchub/shared/api-domains';
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

export async function fetchStoreSitemap(cursor?: string) {
  if (env.NEXT_PUBLIC_API_MOCKING === 'msw') {
    const { mockStoreSitemap } = await import('@opchub/shared/mock-domains');
    const jar = await cookies();
    return mockStoreSitemap(
      cursor,
      jar.get('opchub-mock-store-public')?.value,
      jar.get('opchub-mock-st')?.value,
    );
  }
  const base = portalServerEnv().API_INTERNAL_URL;
  const response = await fetch(
    `${base}/public/stores-sitemap${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`,
    { cache: 'no-store', signal: AbortSignal.timeout(5000) },
  );
  if (!response.ok) throw new Error('Store sitemap is temporarily unavailable');
  return storeSitemapPageSchema.parse(await response.json());
}

/** Backend reads only its storage adapter; no arbitrary logo URL is ever fetched by Next. */
export async function fetchStoreOgLogo(slug: string): Promise<string | null> {
  if (env.NEXT_PUBLIC_API_MOCKING === 'msw') return null;
  try {
    const response = await fetch(
      `${portalServerEnv().API_INTERNAL_URL}/public/stores/${encodeURIComponent(slug)}/logo`,
      { cache: 'no-store', signal: AbortSignal.timeout(3000) },
    );
    const type = response.headers.get('content-type')?.split(';')[0] ?? '';
    if (response.status !== 200 || !['image/png', 'image/jpeg', 'image/webp'].includes(type))
      return null;
    const bytes = await response.arrayBuffer();
    return bytes.byteLength <= 2_000_000
      ? `data:${type};base64,${Buffer.from(bytes).toString('base64')}`
      : null;
  } catch {
    return null;
  }
}
