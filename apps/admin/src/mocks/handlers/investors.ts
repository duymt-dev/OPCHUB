import {
  adminInvestorFilterSchema,
  createInvestorCommentSchema,
  investorStatusPatchSchema,
  pageQuerySchema,
} from '@opchub/shared/api-domains';
import { paginate } from '@opchub/shared/mock-data';
import {
  addInvestorComment,
  adminInvestorSummary,
  exportInvestorsCsv,
  getAdminInvestor,
  listAdminInvestors,
  listInvestorComments,
  setInvestorStatus,
} from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { param, parseBody, parseQuery, reply, userIdOf } from './domain-util';
import { bridged } from './investor-bridge';
import { API } from './util';

const pageSchema = pageQuerySchema(10).extend(adminInvestorFilterSchema.shape);

/**
 * Admin "Nhà đầu tư" (D-58 → D-60, Q-G5c-1): `GET /admin/investors` trả nhà đầu tư đã gộp
 * theo người (QT-10). Đặt trước adminContentHandlers (bản danh sách lần quan tâm cũ).
 * Thao tác ghi + xuất CSV → audit_logs (luật 10).
 */
export const investorHandlers = [
  http.get(`${API}/admin/investors/summary`, () => HttpResponse.json(adminInvestorSummary())),
  http.post(`${API}/admin/investors/export`, async ({ request }) => {
    const b = await parseBody(request, adminInvestorFilterSchema);
    if (!b.ok) return b.res;
    return HttpResponse.json(exportInvestorsCsv(userIdOf(request), b.data.kind, b.data.q));
  }),
  http.get(`${API}/admin/investors`, ({ request }) => {
    const q = parseQuery(request.url, pageSchema);
    if (!q.ok) return q.res;
    const rows = listAdminInvestors(q.data.kind, q.data.q);
    return HttpResponse.json(paginate(rows, q.data.page, q.data.size));
  }),
  http.get(`${API}/admin/investors/:key`, ({ params }) =>
    reply(getAdminInvestor(param(params, 'key'))),
  ),
  http.patch(`${API}/admin/investors/:key/status`, async ({ request, params }) => {
    const b = await parseBody(request, investorStatusPatchSchema);
    if (!b.ok) return b.res;
    return reply(setInvestorStatus(userIdOf(request), param(params, 'key'), b.data.status));
  }),
  http.get(`${API}/admin/investors/:key/comments`, ({ params }) => {
    const r = listInvestorComments(param(params, 'key'));
    return r.ok ? HttpResponse.json({ items: r.data }) : reply(r);
  }),
  http.post(`${API}/admin/investors/:key/comments`, async ({ request, params, cookies }) => {
    const b = await parseBody(request, createInvestorCommentSchema);
    if (!b.ok) return b.res;
    const r = addInvestorComment(userIdOf(request), param(params, 'key'), b.data.body);
    if (!r.ok) return reply(r);
    const { thread, ...comment } = r.data;
    return bridged(HttpResponse.json(comment, { status: 201 }), cookies, { comment: thread });
  }),
];
