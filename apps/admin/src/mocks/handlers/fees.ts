import {
  feeBulkCollectSchema,
  feeExportSchema,
  manualMatchSchema,
  pendingFundraisingQuerySchema,
  unmatchedTxnQuerySchema,
} from '@opchub/shared/api-domains';
import {
  collectFees,
  exportFeesCsv,
  feeSummary,
  listUnmatchedTxns,
  matchUnmatchedTxn,
  matchUnmatchedTxnFundraising,
  pendingMockFundraisings,
  remindAllFees,
} from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { writeFundraisingBridge } from './admin-fundraising';
import { param, parseBody, parseQuery, userIdOf } from './domain-util';
import { apiError } from './util';
import { API } from './util';

/**
 * Bổ sung SRS §13 cho màn Phí thành viên (Q-G4b-1). Đường dẫn một đoạn (`/admin/fees/collect`)
 * không trùng `/admin/fees/:uid/:action`. Thao tác ghi → audit_logs ở BE (luật 10).
 */
export const feeHandlers = [
  http.get(`${API}/admin/fees/summary`, () => HttpResponse.json(feeSummary())),
  http.post(`${API}/admin/fees/collect`, async ({ request }) => {
    const body = await parseBody(request, feeBulkCollectSchema);
    if (!body.ok) return body.res;
    // Như thao tác dòng (`/admin/fees/:uid/:action`): giờ thật, khớp server
    return HttpResponse.json(collectFees(body.data.userIds, Date.now()));
  }),
  http.post(`${API}/admin/fees/remind-all`, () =>
    HttpResponse.json(remindAllFees(), { status: 202 }),
  ),
  http.post(`${API}/admin/fees/export`, async ({ request }) => {
    const body = await parseBody(request, feeExportSchema);
    if (!body.ok) return body.res;
    return HttpResponse.json(exportFeesCsv(body.data.userIds));
  }),
  // BUG-014: hàng "Cần đối soát" + khớp tay (server: m.view đọc, m.edit khớp, 409 khi đã xử lý)
  http.get(`${API}/admin/fees/transactions`, ({ request }) => {
    const q = parseQuery(request.url, unmatchedTxnQuerySchema);
    if (!q.ok) return q.res;
    return HttpResponse.json(listUnmatchedTxns(q.data.before, q.data.size));
  }),
  http.post(`${API}/admin/fees/transactions/:id/match`, async ({ request, params, cookies }) => {
    const body = await parseBody(request, manualMatchSchema);
    if (!body.ok) return body.res;
    const id = param(params, 'id');
    const fund = body.data.kind === 'fundraising';
    const r =
      body.data.kind === 'fundraising'
        ? matchUnmatchedTxnFundraising(userIdOf(request), id, body.data.fundraisingId)
        : matchUnmatchedTxn(id, body.data.userId);
    if (!r.ok) return apiError(r.status, r.code, r.message);
    const res = new HttpResponse(null, { status: 204 });
    // D-113 (F3): khoản Gọi vốn sang "chờ thẩm định" → Portal thấy qua cookie bridge
    if (fund) writeFundraisingBridge(cookies, res);
    return res;
  }),
  // D-113 (F3): khoản Gói Gọi vốn chờ thanh toán cho hộp Khớp tay
  http.get(`${API}/admin/fees/fundraisings/pending`, ({ request }) => {
    const q = parseQuery(request.url, pendingFundraisingQuerySchema);
    if (!q.ok) return q.res;
    return HttpResponse.json(pendingMockFundraisings(q.data.q));
  }),
];
