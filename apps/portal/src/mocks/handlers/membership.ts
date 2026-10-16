import {
  confirmTransfer,
  notifyEventRegistered,
  scheduleBankWebhook,
  serviceRequester,
  setRegistration,
} from '@opchub/shared/mock-domains';
import { http } from 'msw/http';
import { param, reply, userIdOf } from './domain-util';
import { apiError, API } from './util';

/**
 * G3a — bổ sung cho handler gốc (đặt trước để được khớp trước):
 * - `POST /me/membership/transfer-confirm`: D-31 giả lập webhook ngân hàng về trễ
 * - `POST /events/:id/registration`: kèm thông báo nhắc (notification.new)
 * - `GET /me/service-requester`: điền sẵn form tư vấn (Q-G3a-2)
 */
export const membershipHandlers = [
  http.post(`${API}/me/membership/transfer-confirm`, ({ request }) => {
    if (!request.headers.get('Idempotency-Key'))
      return apiError(400, 'VALIDATION_ERROR', 'Thiếu header Idempotency-Key');
    const userId = userIdOf(request);
    const r = confirmTransfer(userId);
    if (r.ok) scheduleBankWebhook(userId);
    return reply(r, 202);
  }),
  http.post(`${API}/events/:id/registration`, ({ request, params }) => {
    const userId = userIdOf(request);
    const id = param(params, 'id');
    const r = setRegistration(userId, id, true);
    if (r.ok) notifyEventRegistered(userId, id);
    return reply(r, 201);
  }),
  http.get(`${API}/me/service-requester`, ({ request }) =>
    reply(serviceRequester(userIdOf(request))),
  ),
];
