import {
  myNeedsSchema,
  type NeedCreateInput,
  type NeedListQuery,
  needListSchema,
  needSchema,
} from '@opchub/shared/api-domains';
import { z } from 'zod';
import { api } from '@/lib/api-client';

/** REST Nhu cầu địa phương (V4-609, REQ-511): danh sách + gợi ý, Nhu cầu của tôi */

const enc = encodeURIComponent;

export type NeedFilter = Omit<NeedListQuery, 'q'> & { q: string };

export const needKeys = {
  all: ['needs'] as const,
  list: (f: NeedFilter) => [...needKeys.all, 'list', f] as const,
  mine: () => [...needKeys.all, 'mine'] as const,
};

/** Bộ lọc → query string như `needListQuerySchema` */
export function needQuery(f: NeedFilter): string {
  const p = new URLSearchParams({ page: String(f.page) });
  if (f.q.trim()) p.set('q', f.q.trim());
  if (f.type) p.set('type', f.type);
  if (f.province) p.set('province', f.province);
  if (f.field) p.set('field', f.field);
  return p.toString();
}

export const fetchNeeds = (f: NeedFilter) =>
  api(`/needs?${needQuery(f)}`, { schema: needListSchema });

export const fetchMyNeeds = () => api('/me/needs', { schema: myNeedsSchema });

export const createNeed = (body: NeedCreateInput) =>
  api('/me/needs', { method: 'POST', body, schema: needSchema });

export const stepNeed = (id: string, action: 'close' | 'reopen') =>
  api(`/me/needs/${enc(id)}`, { method: 'PATCH', body: { action }, schema: needSchema });

export const deleteNeed = (id: string) =>
  api(`/me/needs/${enc(id)}`, { method: 'DELETE', schema: z.null() });
