import {
  defaultStoreSeo,
  storePublicConfigSchema,
  storePublicPageSchema,
  storePublicPatchSchema,
} from '../../api-domains/store-public';
import type { StorePublicPatch } from '../../api-domains/store-public';
import { mockStores, myMockStore, visibleMockStores, type MockStore } from './stores';
import { notFound, ok } from './util';
import { z } from 'zod';

export const STORE_PUBLIC_COOKIE = 'opchub-mock-store-public';
const config = new WeakMap<MockStore, { seoIndex: boolean; title: string; desc: string }>();
const cookieSchema = z.array(z.object({ slug: z.string(), ...storePublicPatchSchema.shape }));

function decode(raw?: string) {
  try {
    return cookieSchema.parse(JSON.parse(decodeURIComponent(raw || '%5B%5D')));
  } catch {
    return [];
  }
}
export function syncMockStorePublic(raw?: string) {
  for (const mark of decode(raw)) {
    const row = mockStores().find((r) => r.slug === mark.slug);
    if (row)
      config.set(row, {
        seoIndex: mark.seoIndex ?? true,
        title: mark.title ?? '',
        desc: mark.desc ?? '',
      });
  }
}
export function mockStorePublicCookie(
  raw: string | undefined,
  slug: string,
  input: StorePublicPatch,
) {
  const marks = decode(raw).filter((r) => r.slug !== slug);
  marks.push({ slug, ...input });
  return `${STORE_PUBLIC_COOKIE}=${encodeURIComponent(JSON.stringify(marks.slice(-2)))}; Path=/; SameSite=Lax`;
}

export function myMockStorePublic(userId: string, origin: string) {
  const own = myMockStore(userId);
  if (!own.ok) return own;
  const row = mockStores().find((r) => r.ownerId === userId);
  if (!row) return notFound('Không tìm thấy gian hàng');
  const saved = config.get(row) ?? { seoIndex: true, title: '', desc: '' };
  return ok(
    storePublicConfigSchema.parse({
      ...saved,
      slug: row.slug,
      url: `${origin}/g/${row.slug}`,
      status: row.status,
      ...defaultStoreSeo(row),
    }),
  );
}
export function patchMockStorePublic(userId: string, origin: string, input: StorePublicPatch) {
  const result = myMockStorePublic(userId, origin);
  if (!result.ok) return result;
  if (result.data.status === 'hidden')
    return {
      ok: false as const,
      status: 409 as const,
      code: 'CONFLICT' as const,
      message: 'Gian hàng đang bị Admin ẩn, vui lòng liên hệ quản trị viên',
    };
  const row = mockStores().find((r) => r.ownerId === userId);
  if (!row) return notFound('Không tìm thấy gian hàng');
  const saved = {
    seoIndex: input.seoIndex ?? result.data.seoIndex,
    title: input.title ?? result.data.title,
    desc: input.desc ?? result.data.desc,
  };
  config.set(row, saved);
  return myMockStorePublic(userId, origin);
}

/** SSR mock projection is request-local: cookies never mutate the Node process's mock database. */
export function mockStorePublicPage(
  slug: string,
  publicCookie?: string,
  statusCookie?: string,
  now = Date.now(),
) {
  const row = visibleMockStores(now).find((r) => r.slug === slug);
  if (!row) return notFound('Không tìm thấy gian hàng');
  const statusSchema = z.array(z.object({ id: z.string(), status: z.string() }));
  let hidden = false;
  try {
    hidden = statusSchema
      .parse(JSON.parse(decodeURIComponent(statusCookie || '%5B%5D')))
      .some((r) => r.id === row.id && r.status !== 'published');
  } catch {
    /* Invalid mock-only bridge cannot make private data visible. */
  }
  if (hidden) return notFound('Không tìm thấy gian hàng');
  const saved = decode(publicCookie).find((r) => r.slug === slug) ?? config.get(row);
  const defaults = defaultStoreSeo(row);
  return ok(
    storePublicPageSchema.parse({
      ...row,
      items: row.items.slice(0, 50),
      seo: {
        index: saved?.seoIndex ?? true,
        title: saved?.title || defaults.defaultTitle,
        desc: saved?.desc || defaults.defaultDesc,
      },
    }),
  );
}
