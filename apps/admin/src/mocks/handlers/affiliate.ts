import {
  affiliateCommissionQuerySchema,
  affiliatePageQuerySchema,
  affiliateSummaryQuerySchema,
  affiliateAdminPolicyPreviewQuerySchema,
  affiliateAdminPolicyPreviewSchema,
} from '@opchub/shared/api-domains';
import {
  mockAdminAffiliateCustomers,
  mockAdminAffiliateDetail,
  mockAdminAffiliateMonths,
  mockAdminAffiliates,
  mockAdminAffiliateSummary,
  mockAdminCommissions,
  mockAffiliatePolicy,
} from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { affiliateAdminGuard } from './affiliate-util';
import { param, parseQuery, reply } from './domain-util';
import { API } from './util';

export const affiliateReadHandlers = [
  http.get(`${API}/admin/affiliate/policy/preview`, ({ request }) => {
    const denied = affiliateAdminGuard(request, 'affiliate.view');
    if (denied) return denied;
    const query = parseQuery(request.url, affiliateAdminPolicyPreviewQuerySchema);
    if (!query.ok) return query.res;
    // Fake API calculation, never a UI fallback; SRS fixed annual list price.
    const feeAmount = 600_000;
    return HttpResponse.json(
      affiliateAdminPolicyPreviewSchema.parse({
        rate: query.data.rate,
        feeAmount,
        commission: Math.floor((feeAmount * query.data.rate) / 100),
      }),
    );
  }),
  http.get(`${API}/admin/affiliate/summary`, ({ request }) => {
    const denied = affiliateAdminGuard(request, 'affiliate.view');
    if (denied) return denied;
    const q = parseQuery(request.url, affiliateSummaryQuerySchema);
    return q.ok ? HttpResponse.json(mockAdminAffiliateSummary(q.data.month)) : q.res;
  }),
  http.get(`${API}/admin/affiliate/commissions`, ({ request }) => {
    const denied = affiliateAdminGuard(request, 'affiliate.view');
    if (denied) return denied;
    const q = parseQuery(request.url, affiliateCommissionQuerySchema);
    return q.ok ? HttpResponse.json(mockAdminCommissions(q.data)) : q.res;
  }),
  http.get(`${API}/admin/affiliates`, ({ request }) => {
    const denied = affiliateAdminGuard(request, 'affiliate.view');
    if (denied) return denied;
    const q = parseQuery(request.url, affiliatePageQuerySchema);
    return q.ok ? HttpResponse.json(mockAdminAffiliates(q.data)) : q.res;
  }),
  http.get(`${API}/admin/affiliate/policy`, ({ request }) => {
    const denied = affiliateAdminGuard(request, 'affiliate.view');
    return denied ?? HttpResponse.json(mockAffiliatePolicy());
  }),
  http.get(`${API}/admin/affiliates/:id/months`, ({ request, params }) => {
    const denied = affiliateAdminGuard(request, 'affiliate.view');
    if (denied) return denied;
    const q = parseQuery(request.url, affiliatePageQuerySchema);
    return q.ok ? reply(mockAdminAffiliateMonths(param(params, 'id'), q.data)) : q.res;
  }),
  http.get(`${API}/admin/affiliates/:id/customers`, ({ request, params }) => {
    const denied = affiliateAdminGuard(request, 'affiliate.view');
    if (denied) return denied;
    const q = parseQuery(request.url, affiliatePageQuerySchema);
    return q.ok ? reply(mockAdminAffiliateCustomers(param(params, 'id'), q.data)) : q.res;
  }),
  http.get(`${API}/admin/affiliates/:id`, ({ request, params }) => {
    const denied = affiliateAdminGuard(request, 'affiliate.view');
    return denied ?? reply(mockAdminAffiliateDetail(param(params, 'id')));
  }),
];
