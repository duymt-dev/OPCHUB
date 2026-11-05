import { isFeeUsable } from '@opchub/shared';
import { meSchema } from '@opchub/shared/api';
import { globalSearchQuerySchema } from '@opchub/shared/api-domains';
import { mockDb, mockGlobalSearch } from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { parseQuery, userIdOf } from './domain-util';
import { API, apiError } from './util';

export const searchHandlers = [
  http.get(`${API}/search`, ({ request, cookies }) => {
    if (!request.headers.get('Authorization'))
      return apiError(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập');
    const query = parseQuery(request.url, globalSearchQuerySchema);
    if (!query.ok) return query.res;
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
    const investor = me.accountType === 'investor';
    const fee = mockDb().fees.find((row) => row.userId === me.id) ?? me.membershipFee;
    if (!investor && !isFeeUsable(fee, new Date()))
      return apiError(402, 'MEMBERSHIP_REQUIRED', 'Vui lòng gia hạn phí');
    return HttpResponse.json(mockGlobalSearch(query.data.q, userIdOf(request), { investor }));
  }),
];
