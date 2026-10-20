import {
  affiliateAdminCustomersSchema,
  affiliateAdminPageSchema,
  affiliateCancelResultSchema,
  affiliateCommissionsSchema,
  affiliateDetailSchema,
  affiliateMonthsSchema,
  affiliatePayoutResultSchema,
  affiliatePolicySchema,
  affiliateAdminPolicyPreviewSchema,
  affiliateRateResultSchema,
  affiliateSummarySchema,
  csvFileSchema,
  type AffiliateCommissionQuery,
  type AffiliatePageQuery,
  type AffiliatePolicy,
} from '@opchub/shared/api-domains';
import { api } from '@/lib/api-client';
import { affiliateQuery } from './model';

const ROOT = '/admin/affiliate';
const AGENTS = '/admin/affiliates';
const agentPath = (id: string) => `${AGENTS}/${encodeURIComponent(id)}`;
const KEY = ['admin-affiliate'] as const;

export const affiliateKeys = {
  all: KEY,
  summary: (month = '') => [...KEY, 'summary', month] as const,
  commissions: (params: AffiliateCommissionQuery) => [...KEY, 'commissions', params] as const,
  agents: (params: AffiliatePageQuery) => [...KEY, 'agents', params] as const,
  detail: (id: string) => [...KEY, 'detail', id] as const,
  months: (id: string, params: AffiliatePageQuery) => [...KEY, 'months', id, params] as const,
  customers: (id: string, params: AffiliatePageQuery) => [...KEY, 'customers', id, params] as const,
  policy: [...KEY, 'policy'] as const,
  policyPreview: (rate: number | null) => [...KEY, 'policy-preview', rate] as const,
};

export function fetchAffiliateSummary(month = '') {
  const query = month ? `?${new URLSearchParams({ month })}` : '';
  return api(`${ROOT}/summary${query}`, { schema: affiliateSummarySchema });
}

export function fetchCommissions(params: AffiliateCommissionQuery) {
  const query = new URLSearchParams(affiliateQuery(params));
  if (params.status !== 'all') query.set('status', params.status);
  return api(`${ROOT}/commissions?${query}`, { schema: affiliateCommissionsSchema });
}

export const fetchAffiliates = (params: AffiliatePageQuery) =>
  api(`${AGENTS}?${affiliateQuery(params)}`, { schema: affiliateAdminPageSchema });

export const fetchAffiliateDetail = (id: string) =>
  api(agentPath(id), { schema: affiliateDetailSchema });

export const fetchAffiliateMonths = (id: string, params: AffiliatePageQuery) =>
  api(`${agentPath(id)}/months?${affiliateQuery(params)}`, { schema: affiliateMonthsSchema });

export const fetchAffiliateCustomers = (id: string, params: AffiliatePageQuery) =>
  api(`${agentPath(id)}/customers?${affiliateQuery(params)}`, {
    schema: affiliateAdminCustomersSchema,
  });

export const cancelCommissions = (ids: string[], reason: string) =>
  api(`${ROOT}/commissions/cancel`, {
    method: 'POST',
    body: { ids, reason },
    schema: affiliateCancelResultSchema,
  });

export const setAffiliateRate = (id: string, rate: number) =>
  api(agentPath(id), { method: 'PATCH', body: { rate }, schema: affiliateRateResultSchema });

export const setAffiliateRates = (ids: string[], rate: number) =>
  api(`${AGENTS}/rate`, {
    method: 'PUT',
    body: { ids, rate },
    schema: affiliateRateResultSchema,
  });

/** Caller retains the same key for a retry of the same financial intent. */
export const payAffiliateMonth = (id: string, monthKey: string, idempotencyKey: string) =>
  api(`${agentPath(id)}/payouts`, {
    method: 'POST',
    body: { monthKey },
    idempotencyKey,
    schema: affiliatePayoutResultSchema,
  });

export const fetchAffiliatePolicy = () => api(`${ROOT}/policy`, { schema: affiliatePolicySchema });

export const fetchAffiliatePolicyPreview = (rate: number) =>
  api(`${ROOT}/policy/preview?${new URLSearchParams({ rate: String(rate) })}`, {
    schema: affiliateAdminPolicyPreviewSchema,
  });

export const saveAffiliatePolicy = (body: AffiliatePolicy) =>
  api(`${ROOT}/policy`, { method: 'PUT', body, schema: affiliatePolicySchema });

interface ExportFilter {
  ids?: string[];
  q?: string;
  status?: AffiliateCommissionQuery['status'];
}

export const exportCommissions = (body: ExportFilter) =>
  api(`${ROOT}/commissions/export`, { method: 'POST', body, schema: csvFileSchema });

export const exportAffiliates = (body: ExportFilter) =>
  api(`${AGENTS}/export`, { method: 'POST', body, schema: csvFileSchema });
