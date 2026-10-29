import {
  groupAdminUpsertSchema,
  messageQuerySchema,
  groupMembersExportSchema,
  groupMembersQuerySchema,
  roomRenameSchema,
} from '@opchub/shared/api-domains';
import {
  deleteMockRoom,
  exportGroupMembers,
  getGroupDetail,
  groupMemberCounts,
  listGroupMembers,
  listMessages,
  listRooms,
  removeGroup,
  renameMockRoom,
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
  // D-111 đổi tên / xoá mềm chủ đề (khai báo trước `/admin/groups/:id`)
  http.patch(`${API}/admin/groups/:id/rooms/:roomId`, async ({ request, params }) => {
    const body = await parseBody(request, roomRenameSchema);
    if (!body.ok) return body.res;
    const [gid, rid] = [param(params, 'id'), param(params, 'roomId')];
    return reply(renameMockRoom(userIdOf(request), gid, rid, body.data));
  }),
  http.delete(`${API}/admin/groups/:id/rooms/:roomId`, ({ request, params }) =>
    reply(deleteMockRoom(userIdOf(request), param(params, 'id'), param(params, 'roomId'))),
  ),
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
];
