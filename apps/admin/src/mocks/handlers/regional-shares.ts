import {
  regionalParamsSchema,
  regionalPayoutBodySchema,
  regionalShareQuerySchema,
  regionalSharePageQuerySchema,
} from '@opchub/shared/api-domains';
import {
  mockRegionalShares,
  mockRegionalSharePage,
  mockRegionalPayoutHistory,
  mockPayRegional,
} from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { mockAdminGuard } from './admin-guard';
import { parseBody, parseQuery, reply, userIdOf } from './domain-util';
import { API } from './util';
export const regionalShareHandlers = [
  http.get(`${API}/admin/gdv/shares`, ({ request }) => {
    const denied = mockAdminGuard(request, 'affiliate.view');
    if (denied) return denied;
    const q = parseQuery(request.url, regionalShareQuerySchema);
    return q.ok ? HttpResponse.json(mockRegionalShares(q.data.q)) : q.res;
  }),
  http.get(`${API}/admin/gdv/:region/shares`, ({ request, params }) => {
    const denied = mockAdminGuard(request, 'affiliate.view');
    if (denied) return denied;
    const p = regionalParamsSchema.safeParse(params);
    const q = parseQuery(request.url, regionalSharePageQuerySchema);
    if (!p.success) return new HttpResponse(null, { status: 422 });
    return q.ok ? reply(mockRegionalSharePage(p.data.region, q.data.cursor, q.data.limit)) : q.res;
  }),
  http.get(`${API}/admin/gdv/:region/payouts`, ({ request, params }) => {
    const denied = mockAdminGuard(request, 'affiliate.view');
    if (denied) return denied;
    const p = regionalParamsSchema.safeParse(params);
    return p.success
      ? HttpResponse.json(mockRegionalPayoutHistory(p.data.region))
      : new HttpResponse(null, { status: 422 });
  }),
  http.post(`${API}/admin/gdv/:region/payouts`, async ({ request, params }) => {
    const denied = mockAdminGuard(request, 'affiliate.payout');
    if (denied) return denied;
    const p = regionalParamsSchema.safeParse(params);
    const b = await parseBody(request, regionalPayoutBodySchema);
    if (!p.success) return new HttpResponse(null, { status: 422 });
    return b.ok
      ? reply(
          mockPayRegional(
            p.data.region,
            b.data.directorUserId,
            request.headers.get('Idempotency-Key') ?? undefined,
            userIdOf(request),
          ),
        )
      : b.res;
  }),
];
