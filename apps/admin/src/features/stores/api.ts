import {
  adminStoreListSchema,
  adminStoreModerateResultSchema,
  adminStoreSchema,
} from '@opchub/shared/api-domains';
import { api } from '@/lib/api-client';
import type { StoreParams } from './types';

/** V4-608 AD-07: `GET /admin/stores?status&q&page`, `GET /admin/stores/:id`, `POST hide|show` */

export const storeKeys = {
  all: ['admin-stores'] as const,
  list: (p: StoreParams) => ['admin-stores', 'list', p] as const,
  detail: (id: string) => ['admin-stores', 'detail', id] as const,
};

export function fetchStores(p: StoreParams) {
  const qs = new URLSearchParams({ page: String(p.page) });
  if (p.status !== 'all') qs.set('status', p.status);
  if (p.q.trim()) qs.set('q', p.q.trim());
  return api(`/admin/stores?${qs.toString()}`, { schema: adminStoreListSchema });
}

export const fetchStore = (id: string) =>
  api(`/admin/stores/${encodeURIComponent(id)}`, { schema: adminStoreSchema });

/** D-89 (P-105): gắn / gỡ "Nổi bật" trên Khám phá Portal */
export const featureStore = (id: string, featured: boolean) =>
  api(`/admin/stores/${encodeURIComponent(id)}/featured`, {
    method: 'PUT',
    body: { featured },
    schema: adminStoreSchema,
  });

export const moderateStores = (action: 'hide' | 'show', ids: string[]) =>
  api(`/admin/stores/${action}`, {
    method: 'POST',
    body: { ids },
    schema: adminStoreModerateResultSchema,
  });
