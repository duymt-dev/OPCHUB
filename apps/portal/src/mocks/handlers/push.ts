import { http, HttpResponse } from 'msw/http';
import {
  pushPreferencesSchema,
  pushSubscribeSchema,
  pushUnsubscribeSchema,
} from '@opchub/shared/api-domains';
import {
  mockPushConfig,
  mockPushPreferences,
  saveMockPushPreferences,
  mockSubscribePush,
  mockUnsubscribePush,
} from '@opchub/shared/mock-domains';
import { parseBody, userIdOf } from './domain-util';
import { API, apiError } from './util';

const authenticated = (request: Request) =>
  request.headers.has('Authorization') ? null : apiError(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập');
export const pushHandlers = [
  http.get(
    `${API}/push/config`,
    ({ request }) => authenticated(request) ?? HttpResponse.json(mockPushConfig()),
  ),
  http.get(
    `${API}/push/preferences`,
    ({ request }) =>
      authenticated(request) ?? HttpResponse.json(mockPushPreferences(userIdOf(request))),
  ),
  http.put(`${API}/push/preferences`, async ({ request }) => {
    const denied = authenticated(request);
    if (denied) return denied;
    const body = await parseBody(request, pushPreferencesSchema);
    if (!body.ok) return body.res;
    return HttpResponse.json(saveMockPushPreferences(userIdOf(request), body.data));
  }),
  http.post(`${API}/push/subscriptions`, async ({ request }) => {
    const denied = authenticated(request);
    if (denied) return denied;
    const body = await parseBody(request, pushSubscribeSchema);
    if (!body.ok) return body.res;
    return HttpResponse.json(mockSubscribePush('member', userIdOf(request), body.data.endpoint), {
      status: 201,
    });
  }),
  http.delete(`${API}/push/subscriptions`, async ({ request }) => {
    const denied = authenticated(request);
    if (denied) return denied;
    const body = await parseBody(request, pushUnsubscribeSchema);
    if (!body.ok) return body.res;
    return HttpResponse.json(mockUnsubscribePush('member', userIdOf(request), body.data.endpoint));
  }),
];
