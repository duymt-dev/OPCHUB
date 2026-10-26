import {
  createCommentSchema,
  createInterestSchema,
  pageQuerySchema,
  projectQuerySchema,
  projectUpsertSchema,
} from '@opchub/shared/api-domains';
import { paginate } from '@opchub/shared/mock-data';
import {
  addComment,
  createInterest,
  getProject,
  listComments,
  listProjects,
  myProjects,
  setRegistration,
  upsertProject,
} from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { param, parseBody, parseQuery, reply, userIdOf } from './domain-util';
import { apiError, API } from './util';

const projectPageSchema = pageQuerySchema(9).extend(
  projectQuerySchema.omit({ status: true }).shape,
);

/** SRS §13 Events + Projects + Investors (Portal) */
export const contentHandlers = [
  http.post(`${API}/events/:id/registration`, ({ request, params }) =>
    reply(setRegistration(userIdOf(request), param(params, 'id'), true), 201),
  ),
  http.delete(`${API}/events/:id/registration`, ({ request, params }) =>
    reply(setRegistration(userIdOf(request), param(params, 'id'), false)),
  ),
  http.get(`${API}/projects`, ({ request }) => {
    const q = parseQuery(request.url, projectPageSchema);
    if (!q.ok) return q.res;
    const { page, size, ...f } = q.data;
    return HttpResponse.json(paginate(listProjects(f, true), page, size));
  }),
  http.get(`${API}/projects/:id`, ({ params }) => {
    const r = getProject(param(params, 'id'));
    // 404 cả khi chưa hiển thị — không lộ sự tồn tại
    if (r.ok && r.data.status !== 'published')
      return apiError(404, 'NOT_FOUND', 'Không tìm thấy dự án');
    return reply(r);
  }),
  http.get(`${API}/me/projects`, ({ request }) =>
    HttpResponse.json({ items: myProjects(userIdOf(request)) }),
  ),
  http.post(`${API}/projects`, async ({ request }) => {
    const body = await parseBody(request, projectUpsertSchema);
    if (!body.ok) return body.res;
    return reply(upsertProject(userIdOf(request), body.data), 201);
  }),
  http.patch(`${API}/projects/:id`, async ({ request, params }) => {
    const body = await parseBody(request, projectUpsertSchema);
    if (!body.ok) return body.res;
    return reply(upsertProject(userIdOf(request), body.data, param(params, 'id')));
  }),
  http.get(`${API}/projects/:id/comments`, ({ params }) =>
    HttpResponse.json({ items: listComments(param(params, 'id')) }),
  ),
  http.post(`${API}/projects/:id/comments`, async ({ request, params }) => {
    const body = await parseBody(request, createCommentSchema);
    if (!body.ok) return body.res;
    return reply(addComment(userIdOf(request), param(params, 'id'), body.data), 201);
  }),
  http.post(`${API}/projects/:id/interest`, async ({ request, params }) => {
    if (!request.headers.get('Idempotency-Key')) {
      return apiError(400, 'VALIDATION_ERROR', 'Thiếu header Idempotency-Key');
    }
    const body = await parseBody(request, createInterestSchema);
    if (!body.ok) return body.res;
    return reply(createInterest(userIdOf(request), param(params, 'id'), body.data), 201);
  }),
];
