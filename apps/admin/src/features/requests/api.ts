import { pageSchema } from '@opchub/shared/api';
import {
  adminServiceCommentSchema,
  adminServiceSchema,
  csvFileSchema,
  serviceRequestSchema,
  serviceRequestSummarySchema,
  staffMemberSchema,
  type ServiceRequestState,
} from '@opchub/shared/api-domains';
import { z } from 'zod';
import { api } from '@/lib/api-client';
import type { RequestParams } from './types';

/** SRS §13 Services (admin) + bổ sung Q-G5c-2 (summary, transition, assignee, catalog, export) */

const requestPageSchema = pageSchema(serviceRequestSchema);
const items = <T extends z.ZodType>(s: T) => z.object({ items: z.array(s) });

export const requestKeys = {
  all: ['admin-requests'] as const,
  list: (p: RequestParams) => ['admin-requests', 'list', p] as const,
  summary: ['admin-requests', 'summary'] as const,
  comments: (code: string) => ['admin-requests', 'comments', code] as const,
  staff: ['admin-requests', 'staff'] as const,
  catalog: ['admin-services'] as const,
};

export function fetchRequests(p: RequestParams) {
  const qs = new URLSearchParams({ page: String(p.page), size: String(p.size) });
  if (p.q.trim()) qs.set('q', p.q.trim());
  if (p.status !== 'all') qs.set('status', p.status);
  return api(`/admin/service-requests?${qs.toString()}`, { schema: requestPageSchema });
}

export const fetchRequestSummary = () =>
  api('/admin/service-requests/summary', { schema: serviceRequestSummarySchema });

export const fetchStaff = () =>
  api('/admin/service-requests/staff', { schema: items(staffMemberSchema) }).then((r) => r.items);

const path = (code: string) => `/admin/service-requests/${encodeURIComponent(code)}`;

/** Đổi trạng thái có điều kiện: server từ chối (409) nếu `from` đã cũ (luật 7) */
export const transitionRequest = (
  code: string,
  from: ServiceRequestState,
  to: ServiceRequestState,
) =>
  api(`${path(code)}/transition`, {
    method: 'POST',
    body: { from, to },
    schema: serviceRequestSchema,
  });

export const assignRequest = (code: string, assignee: string | null) =>
  api(`${path(code)}/assignee`, {
    method: 'PATCH',
    body: { assignee },
    schema: serviceRequestSchema,
  });

export const fetchRequestComments = (code: string) =>
  api(`${path(code)}/comments`, { schema: items(adminServiceCommentSchema) }).then((r) => r.items);

export const sendRequestComment = (code: string, body: string, mentions: string[]) =>
  api(`${path(code)}/comments`, {
    method: 'POST',
    body: { body, mentions },
    schema: adminServiceCommentSchema,
  });

export const exportRequests = () =>
  api('/admin/service-requests/export', { method: 'POST', schema: csvFileSchema });

export const fetchCatalog = () =>
  api('/admin/services', { schema: items(adminServiceSchema) }).then((r) => r.items);

export type ServicePatch = Partial<{
  name: string;
  model: string;
  description: string;
  enabled: boolean;
}>;

export const createService = () =>
  api('/admin/services', { method: 'POST', body: {}, schema: adminServiceSchema });

export const patchService = (id: string, patch: ServicePatch) =>
  api(`/admin/services/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: patch,
    schema: adminServiceSchema,
  });

export const deleteService = (id: string) =>
  api(`/admin/services/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    schema: z.object({ id: z.string() }),
  });
