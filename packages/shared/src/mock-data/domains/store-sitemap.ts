import { mockStores } from './stores';
import { mockStorePublicPage } from './store-public';
import { storeSitemapPageSchema, storeSitemapQuerySchema } from '../../api-domains/store-public';

export function mockStoreSitemap(cursor?: string, publicCookie?: string, statusCookie?: string) {
  const c = storeSitemapQuerySchema.parse(cursor ? { cursor } : {}).cursor;
  const rows = mockStores()
    .filter((s) => {
      const page = mockStorePublicPage(s.slug ?? '', publicCookie, statusCookie);
      return page.ok && page.data.seo.index;
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.id.localeCompare(a.id))
    .filter((r) => !c || r.updatedAt < c.at || (r.updatedAt === c.at && r.id < c.id));
  const page = rows.slice(0, 1000),
    last = page.at(-1);
  return storeSitemapPageSchema.parse({
    items: page.map((r) => ({ slug: r.slug, updatedAt: r.updatedAt })),
    nextCursor:
      rows.length > 1000 && last
        ? btoa(JSON.stringify({ at: last.updatedAt, id: last.id }))
            .replace(/=/g, '')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
        : null,
  });
}
