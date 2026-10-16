import { createServiceRequestSchema } from '@opchub/shared/api-domains';
import {
  confirmTransfer,
  createServiceRequest,
  cursorSlice,
  listServices,
  myMembership,
  myNotifications,
} from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { z } from 'zod';
import { parseBody, parseQuery, reply, userIdOf } from './domain-util';
import { apiError, API } from './util';

const notifQuerySchema = z.object({
  cursor: z.string().optional(),
  size: z.coerce.number().int().min(1).max(50).catch(20),
});

const requireIdempotency = (request: Request) =>
  request.headers.get('Idempotency-Key')
    ? null
    : apiError(400, 'VALIDATION_ERROR', 'Thiếu header Idempotency-Key');

/** SRS §13 Membership + Services + Notifications (Portal) */
export const accountHandlers = [
  http.get(`${API}/me/membership`, ({ request }) => reply(myMembership(userIdOf(request)))),
  http.post(`${API}/me/membership/transfer-confirm`, ({ request }) => {
    const missing = requireIdempotency(request);
    if (missing) return missing;
    return reply(confirmTransfer(userIdOf(request)), 202);
  }),
  http.get(`${API}/notifications`, ({ request }) => {
    const q = parseQuery(request.url, notifQuerySchema);
    if (!q.ok) return q.res;
    const all = myNotifications(userIdOf(request));
    return HttpResponse.json({
      ...cursorSlice(all, q.data.cursor, q.data.size),
      unread: all.filter((n) => !n.read).length,
    });
  }),
  /** Danh mục dịch vụ cho form YC (bổ sung SRS §13 — ghi chú trong báo cáo) */
  http.get(`${API}/services`, () => HttpResponse.json({ items: listServices() })),
  http.post(`${API}/service-requests`, async ({ request }) => {
    const missing = requireIdempotency(request);
    if (missing) return missing;
    const body = await parseBody(request, createServiceRequestSchema);
    if (!body.ok) return body.res;
    return reply(createServiceRequest(body.data), 201);
  }),
];
