import {
  revenueDashboardQuerySchema,
  revenueFormerQuerySchema,
  revenueLedgerQuerySchema,
  revenueMonthsQuerySchema,
  revenuePayoutHistoryQuerySchema,
  revenuePayoutRequestSchema,
  revenueDirectorParamsSchema,
} from '@opchub/shared/api-domains';
import {
  mockRevenueDashboard,
  mockRevenueRetained,
  mockFormerRevenueDirectors,
  mockRevenueLedger,
  mockRevenueMonths,
  mockRevenueBalance,
  mockRevenueHistory,
  payMockDirectorRevenue,
} from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { mockAdminGuard } from './admin-guard';
import { adminWriteGuard, parseAdminBody } from './admin-json';
import { param, parseQuery, reply, userIdOf, validationError } from './domain-util';
import { API } from './util';

const path = `${API}/admin/affiliate/revenue`;
export const revenueSharingHandlers = [
  http.get(`${path}/retained`, ({ request }) => {
    const denied = mockAdminGuard(request, 'affiliate.view');
    return denied ?? HttpResponse.json(mockRevenueRetained());
  }),
  http.get(`${path}/dashboard`, ({ request }) => {
    const denied = mockAdminGuard(request, 'affiliate.view');
    if (denied) return denied;
    const q = parseQuery(request.url, revenueDashboardQuerySchema);
    return q.ok ? HttpResponse.json(mockRevenueDashboard(q.data.q)) : q.res;
  }),
  http.get(`${path}/former`, ({ request }) => {
    const denied = mockAdminGuard(request, 'affiliate.view');
    if (denied) return denied;
    const q = parseQuery(request.url, revenueFormerQuerySchema);
    return q.ok ? HttpResponse.json(mockFormerRevenueDirectors(q.data)) : q.res;
  }),
  http.get(`${path}/payouts`, ({ request }) => {
    const denied = mockAdminGuard(request, 'affiliate.view');
    if (denied) return denied;
    const q = parseQuery(request.url, revenuePayoutHistoryQuerySchema);
    return q.ok ? HttpResponse.json(mockRevenueHistory(q.data)) : q.res;
  }),
  ...(['shares', 'balance', 'months'] as const).map((kind) =>
    http.get(`${path}/:directorId/${kind}`, ({ request, params }) => {
      const denied = mockAdminGuard(request, 'affiliate.view');
      if (denied) return denied;
      const id = revenueDirectorParamsSchema.safeParse({ directorId: param(params, 'directorId') });
      if (!id.success) return validationError(id.error);
      if (kind === 'balance') return reply(mockRevenueBalance(id.data.directorId));
      if (kind === 'months') {
        const q = parseQuery(request.url, revenueMonthsQuerySchema);
        return q.ok ? reply(mockRevenueMonths(id.data.directorId, q.data)) : q.res;
      }
      const q = parseQuery(request.url, revenueLedgerQuerySchema);
      return q.ok ? reply(mockRevenueLedger(id.data.directorId, q.data)) : q.res;
    }),
  ),
  http.post(`${path}/:directorId/payouts`, async ({ request, params }) => {
    const denied = await adminWriteGuard(request, 'affiliate.payout');
    if (denied) return denied;
    const id = revenueDirectorParamsSchema.safeParse({ directorId: param(params, 'directorId') });
    if (!id.success) return validationError(id.error);
    const body = await parseAdminBody(request, revenuePayoutRequestSchema);
    return body.ok
      ? reply(
          payMockDirectorRevenue(
            userIdOf(request),
            id.data.directorId,
            body.data.monthKey,
            request.headers.get('Idempotency-Key') ?? undefined,
          ),
        )
      : body.res;
  }),
];
