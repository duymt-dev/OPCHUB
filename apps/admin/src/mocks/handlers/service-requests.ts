import {
  createAdminServiceCommentSchema,
  pageQuerySchema,
  serviceRequestFilterSchema,
  servicePatchSchema,
  serviceTransitionSchema,
  serviceUpsertSchema,
  updateServiceRequestSchema,
} from '@opchub/shared/api-domains';
import { paginate } from '@opchub/shared/mock-data';
import {
  addAdminServiceComment,
  assignServiceRequest,
  createAdminService,
  deleteAdminService,
  exportServiceRequestsCsv,
  listAdminServiceComments,
  listAdminServices,
  searchServiceRequests,
  serviceStaff,
  serviceRequestSummary,
  transitionServiceRequest,
  updateAdminService,
} from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { z } from 'zod';
import { param, parseBody, parseQuery, reply, userIdOf } from './domain-util';
import { API } from './util';

const pageSchema = pageQuerySchema(10).extend(serviceRequestFilterSchema.shape);
const assignSchema = z.object({ assignee: z.string().trim().max(100).nullable() });

/**
 * Admin "Dịch vụ" (D-61 → D-65, Q-G5c-2) — bổ sung SRS §13 Services. Đặt trước
 * adminSystemHandlers: thay bản danh sách/bình luận cơ bản cùng đường dẫn.
 * Đổi trạng thái chỉ qua `POST …/transition { from, to }` (luật 7). Ghi → audit_logs.
 */
export const serviceRequestHandlers = [
  http.get(`${API}/admin/service-requests/summary`, () =>
    HttpResponse.json(serviceRequestSummary()),
  ),
  http.get(`${API}/admin/service-requests/staff`, () =>
    HttpResponse.json({ items: serviceStaff() }),
  ),
  http.post(`${API}/admin/service-requests/export`, ({ request }) =>
    HttpResponse.json(exportServiceRequestsCsv(userIdOf(request))),
  ),
  http.get(`${API}/admin/service-requests`, ({ request }) => {
    const q = parseQuery(request.url, pageSchema);
    if (!q.ok) return q.res;
    const rows = searchServiceRequests(q.data.status, q.data.q);
    return HttpResponse.json(paginate(rows, q.data.page, q.data.size));
  }),
  http.post(`${API}/admin/service-requests/:code/transition`, async ({ request, params }) => {
    const b = await parseBody(request, serviceTransitionSchema);
    if (!b.ok) return b.res;
    const code = param(params, 'code');
    return reply(transitionServiceRequest(userIdOf(request), code, b.data.from, b.data.to));
  }),
  // PATCH SRS §13: trạng thái chỉ đổi được theo máy trạng thái (từ trạng thái hiện tại)
  http.patch(`${API}/admin/service-requests/:code`, async ({ request, params }) => {
    const b = await parseBody(request, updateServiceRequestSchema);
    if (!b.ok) return b.res;
    const code = param(params, 'code');
    const actor = userIdOf(request);
    const cur = searchServiceRequests().find((r) => r.code === code);
    if (cur && b.data.status !== undefined && b.data.status !== cur.status) {
      const r = transitionServiceRequest(actor, code, cur.status, b.data.status);
      if (!r.ok) return reply(r);
    }
    if (b.data.assignee !== undefined)
      return reply(assignServiceRequest(actor, code, b.data.assignee));
    return cur ? HttpResponse.json(cur) : reply(assignServiceRequest(actor, code, null));
  }),
  http.patch(`${API}/admin/service-requests/:code/assignee`, async ({ request, params }) => {
    const b = await parseBody(request, assignSchema);
    if (!b.ok) return b.res;
    return reply(assignServiceRequest(userIdOf(request), param(params, 'code'), b.data.assignee));
  }),
  http.get(`${API}/admin/service-requests/:code/comments`, ({ params }) => {
    const r = listAdminServiceComments(param(params, 'code'));
    return r.ok ? HttpResponse.json({ items: r.data }) : reply(r);
  }),
  http.post(`${API}/admin/service-requests/:code/comments`, async ({ request, params }) => {
    const b = await parseBody(request, createAdminServiceCommentSchema);
    if (!b.ok) return b.res;
    const code = param(params, 'code');
    return reply(
      addAdminServiceComment(userIdOf(request), code, b.data.body, b.data.mentions),
      201,
    );
  }),
  http.get(`${API}/admin/services`, () => HttpResponse.json({ items: listAdminServices() })),
  http.post(`${API}/admin/services`, async ({ request }) => {
    const b = await parseBody(request, serviceUpsertSchema);
    if (!b.ok) return b.res;
    return reply(createAdminService(userIdOf(request), b.data), 201);
  }),
  http.patch(`${API}/admin/services/:id`, async ({ request, params }) => {
    const b = await parseBody(request, servicePatchSchema);
    if (!b.ok) return b.res;
    return reply(updateAdminService(userIdOf(request), param(params, 'id'), b.data));
  }),
  http.delete(`${API}/admin/services/:id`, ({ request, params }) =>
    reply(deleteAdminService(userIdOf(request), param(params, 'id'))),
  ),
];
