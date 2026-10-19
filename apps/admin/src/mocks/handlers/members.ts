import {
  adminMemberQuerySchema,
  bizVerificationDecisionSchema,
  bulkStatusSchema,
} from '@opchub/shared/api-domains';
import { paginate } from '@opchub/shared/mock-data';
import {
  decideBizVerification,
  listAdminMembers,
  setUsersStatus,
} from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { param, parseBody, parseQuery, reply } from './domain-util';
import { API } from './util';

/**
 * Màn Thành viên (D-07 → D-17). `GET /admin/users` theo SRS §13 + hồ sơ đăng ký + số đếm.
 * Bổ sung (Q-G4a-1): đổi vai trò, khoá/mở hàng loạt, duyệt xác minh DN. Ghi → audit_logs ở BE.
 * Phải đứng trước listHandlers để thay bản `GET /admin/users` cơ bản.
 */
export const memberHandlers = [
  http.get(`${API}/admin/users`, ({ request }) => {
    const q = parseQuery(request.url, adminMemberQuerySchema);
    if (!q.ok) return q.res;
    const { items, counts } = listAdminMembers(q.data.type, q.data.q);
    return HttpResponse.json({ ...paginate(items, q.data.page, q.data.size), counts });
  }),
  http.post(`${API}/admin/users/status`, async ({ request }) => {
    const body = await parseBody(request, bulkStatusSchema);
    if (!body.ok) return body.res;
    return reply(setUsersStatus(body.data.userIds, body.data.status));
  }),
  http.post(`${API}/admin/users/:id/verification`, async ({ request, params }) => {
    const body = await parseBody(request, bizVerificationDecisionSchema);
    if (!body.ok) return body.res;
    return reply(decideBizVerification(param(params, 'id'), body.data.decision));
  }),
];
