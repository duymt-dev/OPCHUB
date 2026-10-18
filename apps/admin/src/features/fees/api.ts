import { pageSchema } from '@opchub/shared/api';
import {
  feeBulkCollectResponseSchema,
  feeBulkRemindResponseSchema,
  feeExportResponseSchema,
  feeRowSchema,
  feeSummarySchema,
  unmatchedTxnPageSchema,
  type FeeAction,
  type ManualMatchRequest,
} from '@opchub/shared/api-domains';
import { z } from 'zod';
import { api } from '@/lib/api-client';
import { TAB_STATUS, TXN_PAGE_SIZE, type FeeParams } from './types';

/** SRS §13 Membership (admin): /admin/fees* — bổ sung summary/collect/remind-all/export (Q-G4b-1) */

const feePageSchema = pageSchema(feeRowSchema);

export const feeKeys = {
  all: ['admin-fees'] as const,
  list: (p: FeeParams) => ['admin-fees', 'list', p] as const,
  summary: ['admin-fees', 'summary'] as const,
  /** BUG-014: hàng "Cần đối soát" — keyset theo `receivedAt` */
  unmatched: ['admin-fees', 'unmatched'] as const,
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

/** BUG-014 / NA-03: giao dịch CK không khớp — keyset `before` = `receivedAt` cuối trang trước */
export function fetchUnmatched(before: string | null, size = TXN_PAGE_SIZE) {
  const qs = new URLSearchParams({ size: String(size) });
  if (before) qs.set('before', before);
  return api(`/admin/fees/transactions?${qs.toString()}`, { schema: unmatchedTxnPageSchema });
}

/** Khớp tay (QĐ-01) → 204; 409 khi giao dịch đã được xử lý */
export const matchTransaction = (id: string, body: ManualMatchRequest) =>
  api(`/admin/fees/transactions/${encodeURIComponent(id)}/match`, {
    method: 'POST',
    body,
    schema: z.null(),
  });

/**
 * Gợi ý thành viên cho hộp Khớp tay (V2Q-93): `/admin/fees?q=` tìm tên / email / đúng Mã TV,
 * trả kèm `memberCode` + hạn phí (`/admin/users` không có Mã TV). NĐT không đóng phí nên không có.
 */
export const searchFeeMembers = (q: string, size = 10) =>
  api(`/admin/fees?${new URLSearchParams({ q, size: String(size), page: '1' }).toString()}`, {
    schema: feePageSchema,
  });
