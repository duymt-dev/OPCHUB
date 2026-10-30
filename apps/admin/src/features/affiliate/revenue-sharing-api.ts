import {
  revenueDashboardSchema,
  revenueFormerSchema,
  revenueLedgerSchema,
  revenueMonthsSchema,
  revenuePayoutHistorySchema,
  revenuePayoutRequestSchema,
  revenuePayoutSchema,
  revenueRetainedSchema,
} from '@opchub/shared/api-domains';
import { api } from '@/lib/api-client';
import type { RevenueCursor } from './revenue-types';

const ROOT = '/admin/affiliate/revenue';
export const revenueKeys = {
  all: ['director-revenue'] as const,
  retained: ['director-revenue', 'retained'] as const,
  dashboard: (q: string) => ['director-revenue', 'dashboard', q] as const,
  former: ['director-revenue', 'former'] as const,
  ledger: (id: string) => ['director-revenue', id, 'ledger'] as const,
  history: (id: string) => ['director-revenue', id, 'history'] as const,
  months: (id: string) => ['director-revenue', id, 'months'] as const,
};
const cursorQuery = (cursor: RevenueCursor, size: number) => {
  const q = new URLSearchParams({ size: String(size) });
  if (cursor) {
    q.set('beforeAt', cursor.at);
    q.set('beforeId', cursor.id);
  }
  return q;
};
export const fetchRevenueRetained = () =>
  api(`${ROOT}/retained`, { schema: revenueRetainedSchema });
export const fetchRevenueDashboard = (q = '') =>
  api(`${ROOT}/dashboard${q.trim() ? `?${new URLSearchParams({ q: q.trim() })}` : ''}`, {
    schema: revenueDashboardSchema,
  });
export const fetchFormerRevenueDirectors = (cursor: string | null) => {
  const q = new URLSearchParams({ size: '20' });
  if (cursor) q.set('beforeId', cursor);
  return api(`${ROOT}/former?${q}`, { schema: revenueFormerSchema });
};
export const fetchRevenueLedger = (id: string, cursor: RevenueCursor) =>
  api(`${ROOT}/${encodeURIComponent(id)}/shares?${cursorQuery(cursor, 8)}`, {
    schema: revenueLedgerSchema,
  });
export const fetchRevenueHistory = (id: string, cursor: RevenueCursor) => {
  const q = cursorQuery(cursor, 20);
  q.set('directorId', id);
  return api(`${ROOT}/payouts?${q}`, { schema: revenuePayoutHistorySchema });
};
export const fetchRevenueMonths = (id: string, cursor: string | null) => {
  const q = new URLSearchParams({ size: '20' });
  if (cursor) q.set('beforeMonth', cursor);
  return api(`${ROOT}/${encodeURIComponent(id)}/months?${q}`, { schema: revenueMonthsSchema });
};
export const payDirectorRevenue = (id: string, monthKey: string, idempotencyKey: string) =>
  api(`${ROOT}/${encodeURIComponent(id)}/payouts`, {
    method: 'POST',
    body: revenuePayoutRequestSchema.parse({ monthKey }),
    idempotencyKey,
    schema: revenuePayoutSchema,
  });
