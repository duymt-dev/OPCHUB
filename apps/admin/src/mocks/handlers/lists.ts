import { mockEvents, mockGroups, mockMembers, paginate } from '@opchub/shared/mock-data';
import { http, HttpResponse } from 'msw/http';
import { API, pageParams } from './util';

const has = (v: string, q: string) => v.toLowerCase().includes(q.toLowerCase());

/** SRS §13 — danh sách cơ bản cho Admin (size mặc định theo BR-12) */
export const listHandlers = [
  http.get(`${API}/admin/users`, ({ request }) => {
    const { q, page, size } = pageParams(request.url, 10);
    const term = q.get('q') ?? '';
    const type = q.get('accountType');
    const rows = mockMembers.filter(
      (m) =>
        (!term || has(m.fullName, term) || has(m.email, term)) && (!type || m.accountType === type),
    );
    return HttpResponse.json(paginate(rows, page, size));
  }),
  http.get(`${API}/groups`, ({ request }) => {
    const { q, page, size } = pageParams(request.url, 12);
    const term = q.get('q') ?? '';
    const rows = mockGroups.filter((g) => !term || has(g.name, term) || has(g.province, term));
    return HttpResponse.json(paginate(rows, page, size));
  }),
  http.get(`${API}/events`, ({ request }) => {
    const { page, size } = pageParams(request.url, 9);
    return HttpResponse.json(paginate(mockEvents, page, size));
  }),
];
