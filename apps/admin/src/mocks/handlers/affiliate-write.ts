import { z } from 'zod';
import {
  affiliateBulkRateSchema,
  affiliateCancelSchema,
  affiliateExportSchema,
  affiliateRateSchema,
  affiliateRestoreSchema,
} from '@opchub/shared/api-domains';
import {
  cancelMockAffiliateCommissions,
  exportMockAffiliateCsv,
  restoreMockAffiliateCommissions,
  saveMockAffiliatePolicy,
  setMockAffiliateRates,
} from '@opchub/shared/mock-domains';
import { http } from 'msw/http';
import { affiliateAdminGuard } from './affiliate-util';
import { param, parseBody, reply, userIdOf } from './domain-util';
import { API } from './util';

export const affiliateWriteHandlers = [
  // D-119: prevent a missing mock route falling through to a stale native provider.
  http.post(`${API}/admin/affiliates/:id/payouts`, () => new Response(null, { status: 404 })),
  http.post(`${API}/admin/affiliate/commissions/cancel`, async ({ request }) => {
    const denied = affiliateAdminGuard(request, 'affiliate.action');
    if (denied) return denied;
    const b = await parseBody(request, affiliateCancelSchema);
    return b.ok ? reply(cancelMockAffiliateCommissions(userIdOf(request), b.data)) : b.res;
  }),
  /** D-110: Đã hủy → Đã ghi nhận */
  http.post(`${API}/admin/affiliate/commissions/restore`, async ({ request }) => {
    const denied = affiliateAdminGuard(request, 'affiliate.action');
    if (denied) return denied;
    const b = await parseBody(request, affiliateRestoreSchema);
    return b.ok ? reply(restoreMockAffiliateCommissions(userIdOf(request), b.data)) : b.res;
  }),
  http.put(`${API}/admin/affiliates/rate`, async ({ request }) => {
    const denied = affiliateAdminGuard(request, 'affiliate.action');
    if (denied) return denied;
    const b = await parseBody(request, affiliateBulkRateSchema);
    return b.ok ? reply(setMockAffiliateRates(userIdOf(request), b.data)) : b.res;
  }),
  http.patch(`${API}/admin/affiliates/:id`, async ({ request, params }) => {
    const denied = affiliateAdminGuard(request, 'affiliate.action');
    if (denied) return denied;
    const b = await parseBody(request, affiliateRateSchema);
    return b.ok
      ? reply(
          setMockAffiliateRates(userIdOf(request), {
            ids: [param(params, 'id')],
            rate: b.data.rate,
          }),
        )
      : b.res;
  }),
  http.put(`${API}/admin/affiliate/policy`, async ({ request }) => {
    const denied = affiliateAdminGuard(request, 'affiliate.action');
    if (denied) return denied;
    const b = await parseBody(request, z.unknown());
    return b.ok ? reply(saveMockAffiliatePolicy(userIdOf(request), b.data)) : b.res;
  }),
  http.post(`${API}/admin/affiliate/commissions/export`, async ({ request }) => {
    const denied = affiliateAdminGuard(request, 'affiliate.action');
    if (denied) return denied;
    const b = await parseBody(request, affiliateExportSchema);
    return b.ok ? reply(exportMockAffiliateCsv(userIdOf(request), 'commissions', b.data)) : b.res;
  }),
  http.post(`${API}/admin/affiliates/export`, async ({ request }) => {
    const denied = affiliateAdminGuard(request, 'affiliate.action');
    if (denied) return denied;
    const b = await parseBody(request, affiliateExportSchema);
    return b.ok ? reply(exportMockAffiliateCsv(userIdOf(request), 'affiliates', b.data)) : b.res;
  }),
];
