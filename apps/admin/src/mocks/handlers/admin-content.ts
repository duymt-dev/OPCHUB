import {
  eventUpsertSchema,
  investorQuerySchema,
  pageQuerySchema,
  projectQuerySchema,
  projectReviewSchema,
} from '@opchub/shared/api-domains';
import { paginate } from '@opchub/shared/mock-data';
import {
  deleteEvent,
  listEvents,
  listInterests,
  listProjects,
  listRegistrations,
  reviewProject,
  upsertEvent,
} from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { param, parseBody, parseQuery, reply } from './domain-util';
import { API } from './util';

const projectPageSchema = pageQuerySchema(10).extend(projectQuerySchema.shape);
const investorPageSchema = pageQuerySchema(10).extend(investorQuerySchema.shape);

/** SRS §13 Chat (reports) + Events (admin) + Projects review + Investors (admin) */
export const adminContentHandlers = [
  http.get(`${API}/admin/events`, ({ request }) => {
    const q = parseQuery(request.url, pageQuerySchema(10));
    if (!q.ok) return q.res;
    return HttpResponse.json(paginate(listEvents(null), q.data.page, q.data.size));
  }),
  http.post(`${API}/admin/events`, async ({ request }) => {
    const body = await parseBody(request, eventUpsertSchema);
    if (!body.ok) return body.res;
    return reply(upsertEvent(body.data), 201);
  }),
  http.patch(`${API}/admin/events/:id`, async ({ request, params }) => {
    const body = await parseBody(request, eventUpsertSchema);
    if (!body.ok) return body.res;
    return reply(upsertEvent(body.data, param(params, 'id')));
  }),
  http.delete(`${API}/admin/events/:id`, ({ params }) => reply(deleteEvent(param(params, 'id')))),
  http.get(`${API}/admin/events/:id/registrations`, ({ request, params }) => {
    const q = parseQuery(request.url, pageQuerySchema(10));
    if (!q.ok) return q.res;
    const r = listRegistrations(param(params, 'id'));
    return r.ok ? HttpResponse.json(paginate(r.data, q.data.page, q.data.size)) : reply(r);
  }),
  http.get(`${API}/admin/projects`, ({ request }) => {
    const q = parseQuery(request.url, projectPageSchema);
    if (!q.ok) return q.res;
    const { page, size, ...f } = q.data;
    return HttpResponse.json(paginate(listProjects(f, false), page, size));
  }),
  http.post(`${API}/admin/projects/:id/review`, async ({ request, params }) => {
    const body = await parseBody(request, projectReviewSchema);
    if (!body.ok) return body.res;
    return reply(reviewProject(param(params, 'id'), body.data.decision, body.data.note));
  }),
  http.get(`${API}/admin/investors`, ({ request }) => {
    const q = parseQuery(request.url, investorPageSchema);
    if (!q.ok) return q.res;
    const rows = listInterests(q.data.kind, q.data.q);
    return HttpResponse.json(paginate(rows, q.data.page, q.data.size));
  }),
];
