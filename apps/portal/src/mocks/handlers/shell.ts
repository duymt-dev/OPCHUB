import { notificationReadSchema } from '@opchub/shared/api-domains';
import {
  cursorSlice,
  dashboardLive,
  inboxNotifications,
  markNotificationsRead,
  takeWelcomeMail,
} from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { z } from 'zod';
import { parseBody, parseQuery, userIdOf } from './domain-util';
import { API } from './util';

const notifQuerySchema = z.object({
  cursor: z.string().optional(),
  size: z.coerce.number().int().min(1).max(50).catch(20),
});

/**
 * Khung app + Dashboard (G2a). Đặt trước `accountHandlers` để `GET /notifications`
 * trả thông báo theo từng người (D-29) với mốc giờ theo thời điểm gọi.
 */
export const shellHandlers = [
  http.get(`${API}/dashboard/live`, () => HttpResponse.json(dashboardLive(Date.now()))),
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
  /** 204 khi không có mail chào mừng chưa xem */
  http.get(`${API}/me/welcome-mail`, ({ request }) => {
    const mail = takeWelcomeMail(userIdOf(request));
    return mail ? HttpResponse.json(mail) : new HttpResponse(null, { status: 204 });
  }),
];
