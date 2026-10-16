import {
  JOIN_DECISIONS,
  joinGroupSchema,
  messageQuerySchema,
  reportMessageSchema,
} from '@opchub/shared/api-domains';
import {
  decideJoin,
  joinGroup,
  leaveGroup,
  listJoinRequests,
  listMessages,
  listRooms,
  reportMessage,
} from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { z } from 'zod';
import { param, parseBody, parseQuery, reply, userIdOf } from './domain-util';
import { API } from './util';

const decisionSchema = z.enum(JOIN_DECISIONS);

/** SRS §13 Groups + Chat (Portal): tham gia nhóm, duyệt yêu cầu, phòng, tin nhắn, báo cáo */
export const communityHandlers = [
  http.post(`${API}/groups/:id/join`, async ({ request, params }) => {
    const body = await parseBody(request, joinGroupSchema);
    if (!body.ok) return body.res;
    return reply(joinGroup(userIdOf(request), param(params, 'id'), body.data.intro), 201);
  }),
  http.delete(`${API}/groups/:id/join`, ({ request, params }) =>
    reply(leaveGroup(userIdOf(request), param(params, 'id'))),
  ),
  http.get(`${API}/groups/:id/requests`, ({ params }) =>
    HttpResponse.json({ items: listJoinRequests(param(params, 'id')) }),
  ),
  http.post(`${API}/groups/:id/requests/:uid/:decision`, ({ params }) => {
    const d = decisionSchema.safeParse(params.decision);
    if (!d.success)
      return reply({ ok: false, status: 404, code: 'NOT_FOUND', message: 'Không tìm thấy' });
    return reply(decideJoin(param(params, 'id'), param(params, 'uid'), d.data));
  }),
  http.get(`${API}/groups/:id/rooms`, ({ params }) =>
    HttpResponse.json({ items: listRooms(param(params, 'id')) }),
  ),
  http.get(`${API}/rooms/:id/messages`, ({ request, params }) => {
    const q = parseQuery(request.url, messageQuerySchema);
    if (!q.ok) return q.res;
    return reply(listMessages(param(params, 'id'), q.data.q, q.data.before, q.data.size));
  }),
  http.post(`${API}/messages/:id/report`, async ({ request, params }) => {
    const body = await parseBody(request, reportMessageSchema);
    if (!body.ok) return body.res;
    return reply(reportMessage(param(params, 'id'), body.data), 201);
  }),
];
