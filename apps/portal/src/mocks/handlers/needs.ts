import {
  needActionSchema,
  needCreateSchema,
  needListQuerySchema,
  needMatchesSchema,
} from '@opchub/shared/api-domains';
import { isFeeUsable } from '@opchub/shared';
import { meSchema } from '@opchub/shared/api';
import {
  createMockNeed,
  deleteMockNeed,
  listMockNeeds,
  myMockNeeds,
  myMockNeedMatches,
  mockDb,
  stepMockNeed,
} from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { param, parseBody, parseQuery, reply, userIdOf } from './domain-util';
import { API, apiError } from './util';

/** V4-609 Nhu cầu địa phương (MSW) — hành vi như server (`/needs`, `/me/needs`) */
export const needHandlers = [
  http.get(`${API}/me/needs/matches`, ({ request, cookies }) => {
    if (!request.headers.get('Authorization'))
      return apiError(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập');
    let session: unknown;
    try {
      const raw: unknown = JSON.parse(decodeURIComponent(cookies['opchub-msw-session'] ?? ''));
      session = typeof raw === 'object' && raw !== null && 'me' in raw ? raw.me : raw;
    } catch {
      return apiError(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập');
    }
    const parsed = meSchema.safeParse(session);
    if (!parsed.success) return apiError(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập');
    const me = parsed.data;
    if (me.accountType === 'investor' || me.status === 'locked')
      return apiError(403, 'FORBIDDEN', 'Không có quyền');
    const fee = mockDb().fees.find((row) => row.userId === me.id) ?? me.membershipFee;
    if (!isFeeUsable(fee, new Date()))
      return apiError(402, 'MEMBERSHIP_REQUIRED', 'Vui lòng gia hạn phí');
    return HttpResponse.json(
      needMatchesSchema.parse(
        me.accountType === 'business'
          ? myMockNeedMatches(me.id)
          : { hasStore: false, storeField: null, rows: [] },
      ),
    );
  }),
  http.get(`${API}/needs`, ({ request }) => {
    const q = parseQuery(request.url, needListQuerySchema);
    return q.ok ? HttpResponse.json(listMockNeeds(q.data, userIdOf(request))) : q.res;
  }),
  http.get(`${API}/me/needs`, ({ request }) => reply(myMockNeeds(userIdOf(request)))),
  http.post(`${API}/me/needs`, async ({ request }) => {
    const body = await parseBody(request, needCreateSchema);
    if (!body.ok) return body.res;
    return reply(createMockNeed(userIdOf(request), body.data), 201);
  }),
  http.patch(`${API}/me/needs/:id`, async ({ request, params }) => {
    const body = await parseBody(request, needActionSchema);
    if (!body.ok) return body.res;
    return reply(stepMockNeed(userIdOf(request), param(params, 'id'), body.data.action));
  }),
  http.delete(`${API}/me/needs/:id`, ({ request, params }) => {
    const r = deleteMockNeed(userIdOf(request), param(params, 'id'));
    return r.ok ? new HttpResponse(null, { status: 204 }) : reply(r);
  }),
];
