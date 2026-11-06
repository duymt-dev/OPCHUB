import { availableStoreSlug, storeSlugBase } from '../../stores/store-slug';

/** Pure initialization, split from public queries to avoid a stores ↔ public-query cycle. */
export function initMockStorePublic(
  rows: { name: string; slug?: string | null | undefined }[],
): void {
  const taken = rows.flatMap((r) => (r.slug ? [r.slug] : []));
  for (const r of rows) {
    if (!r.slug) {
      r.slug = availableStoreSlug(storeSlugBase(r.name), taken);
      taken.push(r.slug);
    }
  }
}
