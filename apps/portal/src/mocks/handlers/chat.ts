import {
  messageQuerySchema,
  pinMessageSchema,
  reactMessageSchema,
  reportMessageSchema,
  sendMessageSchema,
} from '@opchub/shared/api-domains';
import {
  advanceMockReplies,
  chatOverview,
  chatUnread,
  drainMockKeywordHits,
  listChatMessages,
  listChatRooms,
  markRoomRead,
  reportChatMessage,
  roomFiles,
  roomMembers,
  roomPins,
  sendChatMessage,
  setPinned,
  toggleReaction,
} from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { param, parseBody, parseQuery, reply, userIdOf } from './domain-util';
import { API } from './util';

/**
 * SRS §13 Chat (Portal · Chat nhóm). Đặt TRƯỚC communityHandlers (unshift) để trả DTO đầy đủ
 * theo góc nhìn người gọi; DTO là tập cha của bản cũ nên client cũ vẫn parse được.
 * POST /rooms/:id/messages, /messages/:id/reactions, PUT /messages/:id/pin ≙ WS §13.4.
 * NA-09: không có route tạo/xoá chủ đề (như server → 404).
 */
export const chatHandlers = [
  http.get(`${API}/me/chat`, ({ request }) => HttpResponse.json(chatOverview(userIdOf(request)))),
  http.get(`${API}/me/chat/unread`, ({ request }) =>
    HttpResponse.json(chatUnread(userIdOf(request))),
  ),
  http.get(`${API}/groups/:id/rooms`, ({ request, params }) => {
    const r = listChatRooms(userIdOf(request), param(params, 'id'));
    return r.ok ? HttpResponse.json({ items: r.data }) : reply(r);
  }),
  http.post(`${API}/rooms/:id/read`, ({ request, params }) =>
    reply(markRoomRead(userIdOf(request), param(params, 'id'))),
  ),
  http.get(`${API}/rooms/:id/messages`, ({ request, params }) => {
    const q = parseQuery(request.url, messageQuerySchema);
    if (!q.ok) return q.res;
    const { q: text, before, size } = q.data;
    advanceMockReplies();
    // V4-612 (D-77): job từ khoá (worker ở server) chạy trước khi đọc → tin trúng đã ẩn
    drainMockKeywordHits();
    return reply(listChatMessages(userIdOf(request), param(params, 'id'), text, before, size));
  }),
  http.post(`${API}/rooms/:id/messages`, async ({ request, params }) => {
    const body = await parseBody(request, sendMessageSchema);
    if (!body.ok) return body.res;
    return reply(sendChatMessage(userIdOf(request), param(params, 'id'), body.data), 201);
  }),
  http.post(`${API}/messages/:id/reactions`, async ({ request, params }) => {
    const body = await parseBody(request, reactMessageSchema);
    if (!body.ok) return body.res;
    return reply(toggleReaction(userIdOf(request), param(params, 'id'), body.data.emoji));
  }),
  http.put(`${API}/messages/:id/pin`, async ({ request, params }) => {
    const body = await parseBody(request, pinMessageSchema);
    if (!body.ok) return body.res;
    return reply(setPinned(userIdOf(request), param(params, 'id'), body.data.pinned));
  }),
  http.post(`${API}/messages/:id/report`, async ({ request, params }) => {
    const body = await parseBody(request, reportMessageSchema);
    if (!body.ok) return body.res;
    return reply(reportChatMessage(userIdOf(request), param(params, 'id'), body.data), 201);
  }),
  http.get(`${API}/rooms/:id/members`, ({ params }) => reply(roomMembers(param(params, 'id')))),
  http.get(`${API}/rooms/:id/pins`, ({ params }) =>
    HttpResponse.json({ items: roomPins(param(params, 'id')) }),
  ),
  http.get(`${API}/rooms/:id/files`, ({ params }) =>
    HttpResponse.json({ items: roomFiles(param(params, 'id')) }),
  ),
];
