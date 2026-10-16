import { pageSchema } from '@opchub/shared/api';
import {
  adminInvestorSchema,
  adminInvestorSummarySchema,
  csvFileSchema,
  investorCommentSchema,
  type InvestorStatus,
} from '@opchub/shared/api-domains';
import { z } from 'zod';
import { api } from '@/lib/api-client';
import type { InvestorParams } from './types';

/** SRS §13 `GET /admin/investors?kind&q&page` + bổ sung Q-G5c-1 (summary, status, comments, export) */

const investorPageSchema = pageSchema(adminInvestorSchema);
const commentListSchema = z.object({ items: z.array(investorCommentSchema) });

export const investorKeys = {
  all: ['admin-investors'] as const,
  list: (p: InvestorParams) => ['admin-investors', 'list', p] as const,
  summary: ['admin-investors', 'summary'] as const,
  comments: (key: string) => ['admin-investors', 'comments', key] as const,
};

const filterBody = (p: Pick<InvestorParams, 'kind' | 'q'>) => ({
  ...(p.kind !== 'all' ? { kind: p.kind } : {}),
  ...(p.q.trim() ? { q: p.q.trim() } : {}),
});

export function fetchInvestors(p: InvestorParams) {
  const qs = new URLSearchParams({ page: String(p.page), size: String(p.size), ...filterBody(p) });
  return api(`/admin/investors?${qs.toString()}`, { schema: investorPageSchema });
}

export const fetchInvestorSummary = () =>
  api('/admin/investors/summary', { schema: adminInvestorSummarySchema });

const path = (key: string) => `/admin/investors/${encodeURIComponent(key)}`;

export const setInvestorStatus = (key: string, status: InvestorStatus) =>
  api(`${path(key)}/status`, { method: 'PATCH', body: { status }, schema: adminInvestorSchema });

export const fetchInvestorComments = (key: string) =>
  api(`${path(key)}/comments`, { schema: commentListSchema }).then((r) => r.items);

export const sendInvestorComment = (key: string, body: string) =>
  api(`${path(key)}/comments`, { method: 'POST', body: { body }, schema: investorCommentSchema });

export const exportInvestors = (p: Pick<InvestorParams, 'kind' | 'q'>) =>
  api('/admin/investors/export', { method: 'POST', body: filterBody(p), schema: csvFileSchema });
