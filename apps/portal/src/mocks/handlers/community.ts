import {
  joinGroupSchema,
  messageQuerySchema,
  reportMessageSchema,
} from '@opchub/shared/api-domains';
import {
  joinGroup,
  leaveGroup,
  listMessages,
  listRooms,
  reportMessage,
} from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { param, parseBody, parseQuery, reply, userIdOf } from './domain-util';
import { API } from './util';

/** SRS §13 Groups + Chat (Portal): tham gia nhóm (vào ngay — D-71), phòng, tin nhắn, báo cáo */
export const communityHandlers = [
  http.post(`${API}/groups/:id/join`, async ({ request, params }) => {
    const body = await parseBody(request, joinGroupSchema);
    if (!body.ok) return body.res;
    return reply(joinGroup(userIdOf(request), param(params, 'id')), 201);
  }),
  http.delete(`${API}/groups/:id/join`, ({ request, params }) =>
    reply(leaveGroup(userIdOf(request), param(params, 'id'))),
  ),
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
