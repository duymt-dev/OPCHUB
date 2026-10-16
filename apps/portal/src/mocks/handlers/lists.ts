import { eventQuerySchema, groupQuerySchema } from '@opchub/shared/api-domains';
import { paginate } from '@opchub/shared/mock-data';
import { listEvents, listGroups } from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { parseQuery, userIdOf } from './domain-util';
import { API, pageParams } from './util';

/** SRS §13 — GET /groups?region&q&page, GET /events?mode (size mặc định theo BR-12) */
export const listHandlers = [
  http.get(`${API}/groups`, ({ request }) => {
    const { q, page, size } = pageParams(request.url, 12);
    const f = parseQuery(request.url, groupQuerySchema);
    if (!f.ok) return f.res;
    const rows = listGroups(userIdOf(request), { q: q.get('q') ?? undefined, ...f.data });
    return HttpResponse.json(paginate(rows, page, size));
  }),
  http.get(`${API}/events`, ({ request }) => {
    const { page, size } = pageParams(request.url, 9);
    const f = parseQuery(request.url, eventQuerySchema);
    if (!f.ok) return f.res;
    return HttpResponse.json(paginate(listEvents(userIdOf(request), f.data.mode), page, size));
  }),
];
