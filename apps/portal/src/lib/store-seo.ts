import type { StorePublicPage } from '@opchub/shared/api-domains';
import { portalServerEnv } from './env';

export function storeSeoUrls(s: StorePublicPage) {
  const canonical = `${portalServerEnv().PORTAL_URL.replace(/\/$/, '')}/g/${s.slug}`;
  return { canonical, image: s.coverUrl || `${canonical}/opengraph-image` };
}
