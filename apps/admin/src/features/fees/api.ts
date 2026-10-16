import { pageSchema } from '@opchub/shared/api';
import {
  feeBulkCollectResponseSchema,
  feeBulkRemindResponseSchema,
  feeExportResponseSchema,
  feeRowSchema,
  feeSummarySchema,
  type FeeAction,
} from '@opchub/shared/api-domains';
import { api } from '@/lib/api-client';
import { TAB_STATUS, type FeeParams } from './types';

/** SRS §13 Membership (admin): /admin/fees* — bổ sung summary/collect/remind-all/export (Q-G4b-1) */

const feePageSchema = pageSchema(feeRowSchema);

export const feeKeys = {
  all: ['admin-fees'] as const,
  list: (p: FeeParams) => ['admin-fees', 'list', p] as const,
  summary: ['admin-fees', 'summary'] as const,
};

export function fetchFees(p: FeeParams) {
  const qs = new URLSearchParams({ page: String(p.page), size: String(p.size) });
  if (p.q.trim()) qs.set('q', p.q.trim());
  if (p.status !== 'all') qs.set('status', TAB_STATUS[p.status]);
  return api(`/admin/fees?${qs.toString()}`, { schema: feePageSchema });
}

export const fetchFeeSummary = () => api('/admin/fees/summary', { schema: feeSummarySchema });

export const feeRowAction = (userId: string, action: FeeAction) =>
  api(`/admin/fees/${encodeURIComponent(userId)}/${action}`, {
    method: 'POST',
    schema: feeRowSchema,
  });

export const collectFees = (userIds: string[]) =>
  api('/admin/fees/collect', {
    method: 'POST',
    body: { userIds },
    schema: feeBulkCollectResponseSchema,
  });

export const remindFees = (userIds: string[]) =>
  api('/admin/fees/remind', {
    method: 'POST',
    body: { userIds },
    schema: feeBulkRemindResponseSchema,
  });

export const remindAllFees = () =>
  api('/admin/fees/remind-all', { method: 'POST', schema: feeBulkRemindResponseSchema });

export const exportFees = (userIds: string[]) =>
  api('/admin/fees/export', {
    method: 'POST',
    body: { userIds },
    schema: feeExportResponseSchema,
  });
