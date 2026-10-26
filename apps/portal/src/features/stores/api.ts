import {
  storeDetailSchema,
  storeListSchema,
  type StoreListQuery,
  type StoreUpsert,
} from '@opchub/shared/api-domains';
import { api } from '@/lib/api-client';

/** REST Gian hàng địa phương (V4-608, REQ-510): Khám phá, chi tiết, Gian hàng của tôi */

const enc = encodeURIComponent;

export type ExploreFilter = Omit<StoreListQuery, 'q'> & { q: string };

export const storeKeys = {
  all: ['stores'] as const,
  list: (f: ExploreFilter) => [...storeKeys.all, 'list', f] as const,
  detail: (id: string) => [...storeKeys.all, 'detail', id] as const,
  mine: () => [...storeKeys.all, 'mine'] as const,
};

/** Bộ lọc → query string như `storeListQuerySchema` (mảng nối dấu phẩy) */
export function storeQuery(f: ExploreFilter): string {
  const p = new URLSearchParams({ sort: f.sort, page: String(f.page) });
  if (f.q.trim()) p.set('q', f.q.trim());
  if (f.kind) p.set('kind', f.kind);
  if (f.audience.length) p.set('audience', f.audience.join(','));
  if (f.field.length) p.set('field', f.field.join(','));
  if (f.province.length) p.set('province', f.province.join(','));
  return p.toString();
}

export const fetchStores = (f: ExploreFilter) =>
  api(`/stores?${storeQuery(f)}`, { schema: storeListSchema });

export const fetchStore = (id: string) => api(`/stores/${enc(id)}`, { schema: storeDetailSchema });

export const fetchMyStore = () => api('/me/store', { schema: storeDetailSchema });

export const saveMyStore = (body: StoreUpsert) =>
  api('/me/store', { method: 'PUT', body, schema: storeDetailSchema });

export const publishMyStore = () =>
  api('/me/store/publish', { method: 'POST', schema: storeDetailSchema });

export const unpublishMyStore = () =>
  api('/me/store/unpublish', { method: 'POST', schema: storeDetailSchema });
