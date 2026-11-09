import type { StorePublicPage } from '@opchub/shared/api-domains';
import { safeJsonLd, storeJsonLd } from '@opchub/shared/seo';

export function StoreJsonLd(p: { store: StorePublicPage; canonical: string; image: string }) {
  const data = storeJsonLd(p.store, p.canonical, p.image);
  return data ? (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }} />
  ) : null;
}
