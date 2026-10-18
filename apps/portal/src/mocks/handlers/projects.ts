import {
  commentReplySchema,
  commentResolvedSchema,
  createCommentSchema,
  createInterestPortalSchema,
  followProjectSchema,
  likeCommentSchema,
  pageQuerySchema,
  projectListQuerySchema,
  projectSaveSchema,
  sendThreadMessageSchema,
  shareProjectSchema,
} from '@opchub/shared/api-domains';
import { paginate } from '@opchub/shared/mock-data';
import {
  createPortalInterest,
  followProject,
  likeComment,
  listPortalProjects,
  myPortalProjects,
  myThreads,
  ownProject,
  portalComments,
  postPortalComment,
  postThreadMessage,
  projectDetail,
  projectInterests,
  projectStats,
  replyComment,
  requestRepoAccess,
  threadStore,
  resolveComment,
  saveProject,
  shareProject,
  suggestMembers,
} from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { param, parseBody, parseQuery, reply, userIdOf } from './domain-util';
import { bridged } from './investor-bridge';
import { emptyAfterClean, toPlainText } from './plain-text';
import { apiError, API } from './util';

const listSchema = pageQuerySchema(9).extend(projectListQuerySchema.shape);

/**
 * G3b — Dự án OPC (Portal). Đặt TRƯỚC `contentHandlers` để thay các route dự án cũ bằng DTO
 * mở rộng (`projectCardSchema`, `projectDetailSchema`). Endpoint mới: Q-G3b-1.
 */
export const projectHandlers = [
  http.get(`${API}/projects/stats`, ({ request }) =>
    HttpResponse.json(projectStats(userIdOf(request))),
  ),
  http.get(`${API}/projects`, ({ request }) => {
    const q = parseQuery(request.url, listSchema);
    if (!q.ok) return q.res;
    const { page, size, ...f } = q.data;
    return HttpResponse.json(paginate(listPortalProjects(userIdOf(request), f), page, size));
  }),
  http.get(`${API}/me/projects`, ({ request }) =>
    HttpResponse.json({ items: myPortalProjects(userIdOf(request)) }),
  ),
  http.get(`${API}/me/projects/:id`, ({ request, params }) =>
    reply(ownProject(userIdOf(request), param(params, 'id'))),
  ),
  http.get(`${API}/members/suggest`, ({ request }) =>
    HttpResponse.json({ items: suggestMembers(new URL(request.url).searchParams.get('q') ?? '') }),
  ),
  http.get(`${API}/projects/:id`, ({ request, params }) =>
    reply(projectDetail(userIdOf(request), param(params, 'id'))),
  ),
  http.post(`${API}/projects`, async ({ request }) => {
    const body = await parseBody(request, projectSaveSchema);
    if (!body.ok) return body.res;
    return reply(saveProject(userIdOf(request), body.data), 201);
  }),
  http.patch(`${API}/projects/:id`, async ({ request, params }) => {
    const body = await parseBody(request, projectSaveSchema);
    if (!body.ok) return body.res;
    return reply(saveProject(userIdOf(request), body.data, param(params, 'id')));
  }),
  http.put(`${API}/projects/:id/follow`, async ({ request, params }) => {
    const body = await parseBody(request, followProjectSchema);
    if (!body.ok) return body.res;
    return reply(followProject(userIdOf(request), param(params, 'id'), body.data.following));
  }),
  http.post(`${API}/projects/:id/repo-access`, ({ request, params }) =>
    reply(requestRepoAccess(userIdOf(request), param(params, 'id')), 201),
  ),
  http.post(`${API}/projects/:id/share`, async ({ request, params }) => {
    const body = await parseBody(request, shareProjectSchema);
    if (!body.ok) return body.res;
    return reply(
      shareProject(userIdOf(request), param(params, 'id'), body.data.groupIds, body.data.message),
    );
  }),
  http.get(`${API}/projects/:id/comments`, ({ request, params }) =>
    HttpResponse.json({
      items: portalComments(userIdOf(request), param(params, 'id'), Date.now()),
    }),
  ),
  http.post(`${API}/projects/:id/comments`, async ({ request, params }) => {
    const body = await parseBody(request, createCommentSchema);
    if (!body.ok) return body.res;
    const text = toPlainText(body.data.body).trim();
    if (!text) return emptyAfterClean('body');
    const input = { ...body.data, body: text };
    return reply(postPortalComment(userIdOf(request), param(params, 'id'), input), 201);
  }),
  http.put(`${API}/comments/:id/like`, async ({ request, params }) => {
    const body = await parseBody(request, likeCommentSchema);
    if (!body.ok) return body.res;
    return reply(likeComment(userIdOf(request), param(params, 'id'), body.data.liked));
  }),
  http.post(`${API}/comments/:id/replies`, async ({ request, params }) => {
    const body = await parseBody(request, commentReplySchema);
    if (!body.ok) return body.res;
    return reply(replyComment(userIdOf(request), param(params, 'id'), body.data.body), 201);
  }),
  http.put(`${API}/comments/:id/resolved`, async ({ request, params }) => {
    const body = await parseBody(request, commentResolvedSchema);
    if (!body.ok) return body.res;
    return reply(resolveComment(userIdOf(request), param(params, 'id'), body.data.resolved));
  }),
  http.post(`${API}/projects/:id/interest`, async ({ request, params, cookies }) => {
    const key = request.headers.get('Idempotency-Key');
    if (!key) return apiError(400, 'VALIDATION_ERROR', 'Thiếu header Idempotency-Key');
    const body = await parseBody(request, createInterestPortalSchema);
    if (!body.ok) return body.res;
    const r = createPortalInterest(userIdOf(request), param(params, 'id'), body.data, key);
    return bridged(reply(r, 201), cookies, r.ok ? { interest: r.data } : {});
  }),
  http.get(`${API}/projects/:id/interests`, ({ request, params }) => {
    const r = projectInterests(userIdOf(request), param(params, 'id'));
    return r.ok ? HttpResponse.json({ items: r.data }) : reply(r);
  }),
  http.get(`${API}/me/investor-thread`, ({ request }) =>
    HttpResponse.json({ items: myThreads(userIdOf(request)) }),
  ),
  http.post(`${API}/investor-thread/:key/messages`, async ({ request, params, cookies }) => {
    const body = await parseBody(request, sendThreadMessageSchema);
    if (!body.ok) return body.res;
    const r = postThreadMessage(userIdOf(request), param(params, 'key'), body.data.body);
    const comment = r.ok ? threadStore().find((c) => c.id === r.data.id) : undefined;
    return bridged(reply(r, 201), cookies, comment ? { comment } : {});
  }),
];
