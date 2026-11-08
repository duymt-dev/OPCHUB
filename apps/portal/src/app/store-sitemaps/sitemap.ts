import { SITEMAP_LIMIT, sitemapChunks, storeSitemapEntries } from '@/lib/store-sitemap';
export const revalidate = 3600;
export async function generateSitemaps() {
  return sitemapChunks((await storeSitemapEntries()).length);
}
export default async function sitemap({ id }: { id: Promise<string> }) {
  const page = Number(await id);
  if (!Number.isSafeInteger(page) || page < 0) return [];
  return (await storeSitemapEntries()).slice(page * SITEMAP_LIMIT, (page + 1) * SITEMAP_LIMIT);
}
