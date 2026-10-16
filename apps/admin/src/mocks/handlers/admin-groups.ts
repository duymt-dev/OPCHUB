import {
  groupAdminUpsertSchema,
  messageQuerySchema,
  groupMembersExportSchema,
  groupMembersQuerySchema,
  keywordSchema,
} from '@opchub/shared/api-domains';
import {
  addKeyword,
  exportGroupMembers,
  getGroupDetail,
  groupMemberCounts,
  listGroupMembers,
  listKeywords,
  listMessages,
  listRooms,
  removeGroup,
  removeKeyword,
  saveGroup,
} from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { param, parseBody, parseQuery, reply, userIdOf } from './domain-util';
import { API } from './util';

/**
 * Màn Admin "Nhóm cộng đồng" (G4c). Khai báo trước handler CRUD nhóm cơ bản (admin-members)
 * để thân yêu cầu mở rộng (chủ nhóm, phòng, nội quy…) được nhận và ghi audit.
 * Endpoint mới ngoài SRS §13: /admin/groups/:id (GET), /admin/groups/members,
 * /admin/groups/member-counts, /admin/moderation/keywords — Q-G4c-1.
 */
export const adminGroupHandlers = [
  http.get(`${API}/admin/groups/member-counts`, () => HttpResponse.json(groupMemberCounts())),
  http.get(`${API}/admin/groups/members`, ({ request }) => {
    const q = parseQuery(request.url, groupMembersQuerySchema);
    if (!q.ok) return q.res;
    return HttpResponse.json({ items: listGroupMembers(q.data.groupIds, q.data.status) });
  }),
  http.post(`${API}/admin/groups/members/export`, async ({ request }) => {
    const body = await parseBody(request, groupMembersExportSchema);
    if (!body.ok) return body.res;
    return reply(exportGroupMembers(userIdOf(request), body.data), 202);
  }),
  http.get(`${API}/admin/groups/:id`, ({ params }) => reply(getGroupDetail(param(params, 'id')))),
  http.post(`${API}/admin/groups`, async ({ request }) => {
    const body = await parseBody(request, groupAdminUpsertSchema);
    if (!body.ok) return body.res;
    return reply(saveGroup(userIdOf(request), body.data), 201);
  }),
  http.patch(`${API}/admin/groups/:id`, async ({ request, params }) => {
    const body = await parseBody(request, groupAdminUpsertSchema);
    if (!body.ok) return body.res;
    return reply(saveGroup(userIdOf(request), body.data, param(params, 'id')));
  }),
  http.delete(`${API}/admin/groups/:id`, ({ request, params }) =>
    reply(removeGroup(userIdOf(request), param(params, 'id'))),
  ),
  // Trình xem chat chỉ đọc của admin (D-26) — cùng hợp đồng GET của Portal
  http.get(`${API}/groups/:id/rooms`, ({ params }) =>
    HttpResponse.json({ items: listRooms(param(params, 'id')) }),
  ),
  http.get(`${API}/rooms/:id/messages`, ({ request, params }) => {
    const q = parseQuery(request.url, messageQuerySchema);
    if (!q.ok) return q.res;
    return reply(listMessages(param(params, 'id'), q.data.q, q.data.before, q.data.size));
  }),
  http.get(`${API}/admin/moderation/keywords`, () => HttpResponse.json({ items: listKeywords() })),
  http.post(`${API}/admin/moderation/keywords`, async ({ request }) => {
    const body = await parseBody(request, keywordSchema);
    if (!body.ok) return body.res;
    return reply(addKeyword(userIdOf(request), body.data.word), 201);
  }),
  http.delete(`${API}/admin/moderation/keywords/:word`, ({ request, params }) =>
    reply(removeKeyword(userIdOf(request), decodeURIComponent(param(params, 'word')))),
  ),
];
