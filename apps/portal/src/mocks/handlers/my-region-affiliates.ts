import { http, HttpResponse } from 'msw/http';
import { myRegionAffiliateQuerySchema } from '@opchub/shared/api-domains';
import { mockMyRegionAffiliateCsv, mockMyRegionAffiliatePage } from '@opchub/shared/mock-domains';
import { parseQuery, userIdOf } from './domain-util';
import { API, apiError } from './util';

const denied = () => apiError(403, 'FORBIDDEN', 'Chỉ Giám đốc Vùng đương nhiệm được xem danh sách');
export const myRegionAffiliateHandlers = [
  http.get(`${API}/me/gdv/affiliates`, ({ request }) => {
    if (!request.headers.get('Authorization'))
      return apiError(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập');
    const q = parseQuery(request.url, myRegionAffiliateQuerySchema);
    if (!q.ok) return q.res;
    const page = mockMyRegionAffiliatePage(userIdOf(request), q.data);
    return page ? HttpResponse.json(page) : denied();
  }),
  http.get(`${API}/me/gdv/affiliates.csv`, ({ request }) => {
    if (!request.headers.get('Authorization'))
      return apiError(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập');
    const csv = mockMyRegionAffiliateCsv(userIdOf(request));
    return csv === null
      ? denied()
      : new HttpResponse(csv, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': 'attachment; filename="regional-affiliates.csv"',
          },
        });
  }),
];
