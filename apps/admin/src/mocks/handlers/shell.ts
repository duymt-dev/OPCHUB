import { notificationReadSchema } from '@opchub/shared/api-domains';
import {
  cursorSlice,
  inboxNotifications,
  listReports,
  markNotificationsRead,
  mockOverview,
  projectCounts,
  unnotedServiceRequestCount,
  upsertProject,
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
      requests: unnotedServiceRequestCount(),
    }),
  ),
  /**
   * Chỉ MSW (e2e NA-24): thành viên gửi một dự án mới chờ duyệt — CSDL giả nằm trong trang Admin
   * nên không có đường Portal để tạo; server dùng API Portal thật.
   */
  http.post(`${API}/__mock/projects/submit`, () => {
    const r = upsertProject('m2', {
      name: 'Dự án chờ duyệt mới',
      category: 'SaaS',
      summary: 'Dự án mới gửi duyệt để kiểm tra số đỏ',
      stage: 'idea',
      country: 'Việt Nam',
      tags: [],
      shareToGroupIds: [],
      submit: true,
    });
    return HttpResponse.json({ ok: r.ok }, { status: r.ok ? 201 : 400 });
  }),
  /** B44 `GET /admin/overview`: số liệu prototype v4 + Luồng hệ thống từ CSDL giả (D-01, D-89) */
  http.get(`${API}/admin/overview`, () => HttpResponse.json(mockOverview())),
];
