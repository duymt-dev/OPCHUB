import {
  adminEventUpsertSchema,
  eventCheckInSchema,
  pageQuerySchema,
} from '@opchub/shared/api-domains';
import { paginate } from '@opchub/shared/mock-data';
import {
  adminUpcoming,
  checkInRegistrants,
  EVENT_BRIDGE_COOKIE,
  eventBridgeCookie,
  exportEventRegistrants,
  listAdminEvents,
  listEventRegistrants,
  removeAdminEvent,
  saveAdminEvent,
} from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { param, parseBody, parseQuery, reply, userIdOf } from './domain-util';
import { API } from './util';

/**
 * Màn Admin "Nội dung & Sự kiện" (G5a). Khai báo trước CRUD cơ bản (admin-content) để thân
 * mở rộng (giờ kết thúc, bản đồ, nhóm, mở đăng ký, ảnh bìa) được nhận và ghi audit.
 * Ngoài SRS §13: check-in, xuất danh sách — Q-G5a-1.
 */
function bridgedEventStatus(
  res: Response,
  cookies: Record<string, string>,
  id: string,
  registrationOpen: boolean,
): Response {
  if (!res.ok) return res;
  const raw =
    typeof document === 'undefined'
      ? cookies[EVENT_BRIDGE_COOKIE]
      : document.cookie
          .split('; ')
          .find((c) => c.startsWith(`${EVENT_BRIDGE_COOKIE}=`))
          ?.slice(EVENT_BRIDGE_COOKIE.length + 1);
  const c = eventBridgeCookie(raw, undefined, {
    id,
    registrationOpen,
    at: new Date().toISOString(),
  });
  if (typeof document === 'undefined') res.headers.append('Set-Cookie', c);
  else document.cookie = c;
  return res;
}

export const adminEventHandlers = [
  // Màn tải trọn sự kiện rồi lọc/đếm tại chỗ như prototype (số sự kiện nhỏ)
  http.get(`${API}/admin/events`, () => {
    const items = listAdminEvents();
    return HttpResponse.json({
      items,
      page: 1,
      size: Math.max(1, items.length),
      total: items.length,
    });
  }),
  /** EV-R02: khối "Sắp diễn ra" — khai báo trước `:id` */
  http.get(`${API}/admin/events/upcoming`, () => HttpResponse.json(adminUpcoming())),
  http.post(`${API}/admin/events`, async ({ request, cookies }) => {
    const body = await parseBody(request, adminEventUpsertSchema);
    if (!body.ok) return body.res;
    const r = saveAdminEvent(userIdOf(request), body.data);
    const res = reply(r, 201);
    if (r.ok) return bridgedEventStatus(res, cookies, r.data.id, body.data.registrationOpen);
    return res;
  }),
  http.patch(`${API}/admin/events/:id`, async ({ request, cookies, params }) => {
    const body = await parseBody(request, adminEventUpsertSchema);
    if (!body.ok) return body.res;
    const id = param(params, 'id');
    const r = saveAdminEvent(userIdOf(request), body.data, id);
    const res = reply(r);
    if (r.ok) return bridgedEventStatus(res, cookies, r.data.id, body.data.registrationOpen);
    return res;
  }),
  http.delete(`${API}/admin/events/:id`, ({ request, params }) =>
    reply(removeAdminEvent(userIdOf(request), param(params, 'id'))),
  ),
  // Đúng hợp đồng §13 (trang); thêm `org` + trạng thái check-in, kèm người đăng ký mẫu
  http.get(`${API}/admin/events/:id/registrations`, ({ request, params }) => {
    const q = parseQuery(request.url, pageQuerySchema(10));
    if (!q.ok) return q.res;
    const r = listEventRegistrants(param(params, 'id'));
    return r.ok ? HttpResponse.json(paginate(r.data, q.data.page, q.data.size)) : reply(r);
  }),
  http.post(`${API}/admin/events/:id/registrations/export`, ({ request, params }) =>
    reply(exportEventRegistrants(userIdOf(request), param(params, 'id'))),
  ),
  http.post(`${API}/admin/events/:id/registrations/check-in`, async ({ request, params }) => {
    const body = await parseBody(request, eventCheckInSchema);
    if (!body.ok) return body.res;
    const { userIds, attended } = body.data;
    const r = checkInRegistrants(userIdOf(request), param(params, 'id'), userIds, attended);
    return reply(r);
  }),
];
