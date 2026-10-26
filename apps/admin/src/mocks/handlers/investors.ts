import { adminInvestorFilterSchema, pageQuerySchema } from '@opchub/shared/api-domains';
import { paginate } from '@opchub/shared/mock-data';
import {
  adminInvestorSummary,
  exportInvestorsCsv,
  getAdminInvestor,
  listAdminInvestors,
} from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { param, parseBody, parseQuery, reply, userIdOf } from './domain-util';
import { API } from './util';

const pageSchema = pageQuerySchema(10).extend(adminInvestorFilterSchema.shape);

/**
 * Admin "Nhà đầu tư" (D-58 → D-60, Q-G5c-1): `GET /admin/investors` trả nhà đầu tư đã gộp
 * theo người (QT-10). Đặt trước adminContentHandlers (bản danh sách lần quan tâm cũ).
 * Xuất CSV → audit_logs (luật 10). D-72: không còn đổi trạng thái / trao đổi.
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
];
