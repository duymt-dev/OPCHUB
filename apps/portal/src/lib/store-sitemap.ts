import 'server-only';
import type { MetadataRoute } from 'next';
import { cache } from 'react';
import { fetchStoreSitemap } from './server-api';
import { portalServerEnv } from './env';
import { serverLogger } from './server-logger';

export const SITEMAP_LIMIT = 50_000;
export const publicOrigin = () => portalServerEnv().PORTAL_URL.replace(/\/$/, '');
/** API pagination is narrow and keyset based; no per-store fetch/query. Fail closed on partial data. */
export const storeSitemapEntries = cache(async (): Promise<MetadataRoute.Sitemap> => {
  const origin = publicOrigin();
  const result: MetadataRoute.Sitemap = [{ url: `${origin}/huong-dan` }];
  let cursor: string | undefined;
  const seen = new Set<string>();
  try {
    do {
      const page = await fetchStoreSitemap(cursor);
      result.push(
        ...page.items.map((s) => ({
          url: `${origin}/g/${s.slug}`,
          lastModified: s.updatedAt,
        })),
      );
      cursor = page.nextCursor ?? undefined;
      if (cursor) {
        if (seen.has(cursor)) throw new Error('Repeated sitemap cursor');
        seen.add(cursor);
      }
    } while (cursor);
    return result;
  } catch {
    serverLogger.warn('store_sitemap_unavailable');
    return result.slice(0, 1);
  }
});

export const sitemapChunks = (count: number) =>
  Array.from({ length: Math.max(1, Math.ceil(count / SITEMAP_LIMIT)) }, (_, id) => ({ id }));
