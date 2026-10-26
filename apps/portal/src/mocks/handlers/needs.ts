import {
  needActionSchema,
  needCreateSchema,
  needListQuerySchema,
} from '@opchub/shared/api-domains';
import {
  createMockNeed,
  deleteMockNeed,
  listMockNeeds,
  myMockNeeds,
  stepMockNeed,
} from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { param, parseBody, parseQuery, reply, userIdOf } from './domain-util';
import { API } from './util';

/** V4-609 Nhu cầu địa phương (MSW) — hành vi như server (`/needs`, `/me/needs`) */
export const needHandlers = [
  http.get(`${API}/needs`, ({ request }) => {
    const q = parseQuery(request.url, needListQuerySchema);
    return q.ok ? HttpResponse.json(listMockNeeds(q.data, userIdOf(request))) : q.res;
  }),
  http.get(`${API}/me/needs`, ({ request }) => reply(myMockNeeds(userIdOf(request)))),
  http.post(`${API}/me/needs`, async ({ request }) => {
    const body = await parseBody(request, needCreateSchema);
    if (!body.ok) return body.res;
    return reply(createMockNeed(userIdOf(request), body.data), 201);
  }),
  http.patch(`${API}/me/needs/:id`, async ({ request, params }) => {
    const body = await parseBody(request, needActionSchema);
    if (!body.ok) return body.res;
    return reply(stepMockNeed(userIdOf(request), param(params, 'id'), body.data.action));
  }),
  http.delete(`${API}/me/needs/:id`, ({ request, params }) => {
    const r = deleteMockNeed(userIdOf(request), param(params, 'id'));
    return r.ok ? new HttpResponse(null, { status: 204 }) : reply(r);
  }),
];
