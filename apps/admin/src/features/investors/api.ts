import { pageSchema } from '@opchub/shared/api';
import {
  adminInvestorSchema,
  adminInvestorSummarySchema,
  csvFileSchema,
} from '@opchub/shared/api-domains';
import { api } from '@/lib/api-client';
import type { InvestorParams } from './types';

/** SRS §13 `GET /admin/investors?kind&q&page` + bổ sung Q-G5c-1 (summary, export); D-72 bỏ trạng thái/trao đổi */

const investorPageSchema = pageSchema(adminInvestorSchema);

export const investorKeys = {
  all: ['admin-investors'] as const,
  list: (p: InvestorParams) => ['admin-investors', 'list', p] as const,
  summary: ['admin-investors', 'summary'] as const,
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

export const exportInvestors = (p: Pick<InvestorParams, 'kind' | 'q'>) =>
  api('/admin/investors/export', { method: 'POST', body: filterBody(p), schema: csvFileSchema });
