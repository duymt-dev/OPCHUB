import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { publicOrigin, sitemapChunks, storeSitemapEntries } from '@/lib/store-sitemap';

const PRIVATE_PATHS = [
  '/dashboard',
  '/stores',
  '/needs',
  '/projects',
  '/chat',
  '/profile',
  '/login',
  '/register',
  '/r/',
  '/sso/',
  '/unsubscribe',
  '/v1/',
  '/community',
  '/events',
  '/investors',
  '/affiliate',
  '/notifications',
  '/settings',
  '/forgot-password',
  '/reset-password',
];
export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get('host')?.toLowerCase();
  if (host !== new URL(publicOrigin()).host.toLowerCase()) {
    return { rules: { userAgent: '*', disallow: '/' } };
  }
  const chunks = sitemapChunks((await storeSitemapEntries()).length);
  return {
    rules: { userAgent: '*', allow: ['/g/', '/huong-dan'], disallow: PRIVATE_PATHS },
    sitemap: [
      `${publicOrigin()}/sitemap.xml`,
      ...chunks.slice(1).map(({ id }) => `${publicOrigin()}/store-sitemaps/sitemap/${id}.xml`),
    ],
  };
}
