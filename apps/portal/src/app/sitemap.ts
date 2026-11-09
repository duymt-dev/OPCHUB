import { SITEMAP_LIMIT, storeSitemapEntries } from '@/lib/store-sitemap';
export const revalidate = 3600;
/** Root alias for the first chunk; robots advertises additional generated files when required. */
export default async function sitemap() {
  return (await storeSitemapEntries()).slice(0, SITEMAP_LIMIT);
}
