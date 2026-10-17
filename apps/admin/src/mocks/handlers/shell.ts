import { notificationReadSchema } from '@opchub/shared/api-domains';
import {
  cursorSlice,
  inboxNotifications,
  listReports,
  markNotificationsRead,
  OVERVIEW_FIXTURE,
  projectCounts,
  serviceRequestSummary,
} from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { z } from 'zod';
import { parseBody, parseQuery, userIdOf } from './domain-util';
import { API } from './util';

const notifQuerySchema = z.object({
  cursor: z.string().optional(),
  size: z.coerce.number().int().min(1).max(50).catch(20),
});

/** Thông báo topbar Admin theo TK đang đăng nhập (D-04, D-29) */
export const shellHandlers = [
  http.get(`${API}/notifications`, ({ request }) => {
    const q = parseQuery(request.url, notifQuerySchema);
    if (!q.ok) return q.res;
    const all = inboxNotifications(userIdOf(request), Date.now());
    return HttpResponse.json({
      ...cursorSlice(all, q.data.cursor, q.data.size),
      unread: all.filter((n) => !n.read).length,
    });
  }),
  http.post(`${API}/notifications/read`, async ({ request }) => {
    const body = await parseBody(request, notificationReadSchema);
    if (!body.ok) return body.res;
    return HttpResponse.json(markNotificationsRead(userIdOf(request), body.data.ids));
  }),
  /** B44 `GET /admin/badges`: báo cáo mở, dự án chờ duyệt, yêu cầu dịch vụ mới */
  http.get(`${API}/admin/badges`, () =>
    HttpResponse.json({
      reports: listReports(undefined, 'open').length,
      projects: projectCounts().pending_review,
      requests: serviceRequestSummary().byStatus.new,
    }),
  ),
  /** B44 `GET /admin/overview`: số liệu prototype (D-01) */
  http.get(`${API}/admin/overview`, () => HttpResponse.json(OVERVIEW_FIXTURE)),
];
