import { eventQuerySchema, groupQuerySchema } from '@opchub/shared/api-domains';
import { mockMembers, paginate } from '@opchub/shared/mock-data';
import { listEvents, listGroups, userStatusOf } from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { parseQuery } from './domain-util';
import { API, pageParams } from './util';

const has = (v: string, q: string) => v.toLowerCase().includes(q.toLowerCase());

/** SRS §13 — danh sách cơ bản cho Admin (size mặc định theo BR-12) */
export const listHandlers = [
  http.get(`${API}/admin/users`, ({ request }) => {
    const { q, page, size } = pageParams(request.url, 10);
    const term = q.get('q') ?? '';
    const type = q.get('type') ?? q.get('accountType');
    const rows = mockMembers
      .filter(
        (m) =>
          (!term || has(m.fullName, term) || has(m.email, term)) &&
          (!type || m.accountType === type),
      )
      .map((m) => ({ ...m, status: userStatusOf(m.id) }));
    return HttpResponse.json(paginate(rows, page, size));
  }),
  http.get(`${API}/groups`, ({ request }) => {
    const { q, page, size } = pageParams(request.url, 12);
    const f = parseQuery(request.url, groupQuerySchema);
    if (!f.ok) return f.res;
    const rows = listGroups(null, { q: q.get('q') ?? undefined, ...f.data });
    return HttpResponse.json(paginate(rows, page, size));
  }),
  http.get(`${API}/events`, ({ request }) => {
    const { page, size } = pageParams(request.url, 9);
    const f = parseQuery(request.url, eventQuerySchema);
    if (!f.ok) return f.res;
    return HttpResponse.json(paginate(listEvents(null, f.data.mode), page, size));
  }),
];
