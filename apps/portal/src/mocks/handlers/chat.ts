import {
  groupFileQuerySchema,
  messageQuerySchema,
  pinMessageSchema,
  reactMessageSchema,
  reportMessageSchema,
  sendMessageSchema,
} from '@opchub/shared/api-domains';
import {
  advanceMockReplies,
  attachmentLink,
  chatOverview,
  chatUnread,
  drainMockKeywordHits,
  groupFiles,
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
import { API, apiError } from './util';

/**
 * SRS §13 Chat (Portal · Chat nhóm). Đặt TRƯỚC communityHandlers (unshift) để trả DTO đầy đủ
 * theo góc nhìn người gọi; DTO là tập cha của bản cũ nên client cũ vẫn parse được.
 * POST /rooms/:id/messages, /messages/:id/reactions, PUT /messages/:id/pin ≙ WS §13.4.
 * NA-09: không có route tạo chủ đề ở Portal (như server → 404); D-111 đổi tên / xoá ở Admin.
 */
export const chatHandlers = [
  // REQ-209 / D-61: explicitly model absent native routes, never proxy to a real API.
  http.post(`${API}/groups/:id/rooms`, () => apiError(404, 'NOT_FOUND', 'Không tìm thấy')),
  http.delete(`${API}/rooms/:id`, () => apiError(404, 'NOT_FOUND', 'Không tìm thấy')),
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
  http.get(`${API}/messages/:id/attachment`, ({ params }) =>
    reply(attachmentLink(param(params, 'id'))),
  ),
  /** D-98 tab "File chia sẻ" theo nhóm */
  http.get(`${API}/groups/:id/files`, ({ request, params }) => {
    const q = parseQuery(request.url, groupFileQuerySchema);
    if (!q.ok) return q.res;
    return reply(groupFiles(userIdOf(request), param(params, 'id'), q.data));
  }),
  http.get(`${API}/rooms/:id/files`, ({ params }) =>
    HttpResponse.json({ items: roomFiles(param(params, 'id')) }),
  ),
];
