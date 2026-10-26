import { adminNeedListSchema, adminStoreModerateResultSchema } from '@opchub/shared/api-domains';
import { api } from '@/lib/api-client';
import type { NeedParams } from './types';

/** V4-609 AD-07: `GET /admin/needs?status&q&page`, `POST /admin/needs/hide|show` → `{ changed }` */

export const needKeys = {
  all: ['admin-needs'] as const,
  list: (p: NeedParams) => ['admin-needs', 'list', p] as const,
};

export function fetchNeeds(p: NeedParams) {
  const qs = new URLSearchParams({ page: String(p.page) });
  if (p.status !== 'all') qs.set('status', p.status);
  if (p.q.trim()) qs.set('q', p.q.trim());
  return api(`/admin/needs?${qs.toString()}`, { schema: adminNeedListSchema });
}

export const moderateNeeds = (action: 'hide' | 'show', ids: string[]) =>
  api(`/admin/needs/${action}`, {
    method: 'POST',
    body: { ids },
    schema: adminStoreModerateResultSchema,
  });
