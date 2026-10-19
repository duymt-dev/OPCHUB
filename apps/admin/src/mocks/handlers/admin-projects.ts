import {
  adminProjectReviewSchema,
  pageQuerySchema,
  projectBulkSchema,
  projectFeatureSchema,
} from '@opchub/shared/api-domains';
import { PROJECT_STATUS } from '@opchub/shared';
import { paginate } from '@opchub/shared/mock-data';
import {
  bulkProjects,
  deleteProjects,
  getAdminProject,
  listAdminProjects,
  projectCounts,
  REVISION_SEED_COOKIE,
  seedRevisionFromCookie,
  setFeaturedProject,
  transitionProject,
} from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { z } from 'zod';
import { param, parseBody, parseQuery, reply, userIdOf } from './domain-util';
import { API } from './util';

const listSchema = pageQuerySchema(10).extend({ status: z.enum(PROJECT_STATUS).optional() });

/**
 * Màn Admin "Kiểm duyệt dự án" (G5b). Đặt trước admin-content để thay bản cơ bản của
 * GET /admin/projects và POST /admin/projects/:id/review (thêm ảnh bìa, repo, nổi bật,
 * quyết định "Xuất bản lại"). Endpoint ngoài SRS §13: /admin/projects/counts, /bulk,
 * /featured, GET + DELETE /admin/projects/:id — Q-G5b-1. Mọi thao tác ghi audit_logs.
 */
export const adminProjectHandlers = [
  // REQ-106 (D-63): e2e dựng sẵn bản sửa Chờ duyệt qua cookie — Portal và Admin MSW khác CSDL
  http.all(`${API}/admin/projects*`, ({ cookies }) => {
    seedRevisionFromCookie(cookies[REVISION_SEED_COOKIE]);
    return undefined;
  }),
  http.get(`${API}/admin/projects`, ({ request }) => {
    const q = parseQuery(request.url, listSchema);
    if (!q.ok) return q.res;
    const rows = listAdminProjects(q.data.status, q.data.q);
    return HttpResponse.json(paginate(rows, q.data.page, q.data.size));
  }),
  http.get(`${API}/admin/projects/counts`, () => HttpResponse.json(projectCounts())),
  http.post(`${API}/admin/projects/bulk`, async ({ request }) => {
    const body = await parseBody(request, projectBulkSchema);
    if (!body.ok) return body.res;
    return HttpResponse.json(bulkProjects(userIdOf(request), body.data.ids, body.data.action));
  }),
  http.put(`${API}/admin/projects/featured`, async ({ request }) => {
    const body = await parseBody(request, projectFeatureSchema);
    if (!body.ok) return body.res;
    return reply(setFeaturedProject(userIdOf(request), body.data.projectId));
  }),
  http.get(`${API}/admin/projects/:id`, ({ params }) =>
    reply(getAdminProject(param(params, 'id'))),
  ),
  http.post(`${API}/admin/projects/:id/review`, async ({ request, params }) => {
    const body = await parseBody(request, adminProjectReviewSchema);
    if (!body.ok) return body.res;
    const { decision, note } = body.data;
    return reply(transitionProject(userIdOf(request), param(params, 'id'), decision, note));
  }),
  http.delete(`${API}/admin/projects/:id`, ({ request, params }) => {
    const id = param(params, 'id');
    const r = deleteProjects(userIdOf(request), [id]);
    return r.done.length ? HttpResponse.json({ id }) : reply(getAdminProject(id)); // 404 đúng hợp đồng
  }),
];
