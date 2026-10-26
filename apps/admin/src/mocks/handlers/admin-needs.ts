import { adminNeedModerateSchema, adminNeedQuerySchema } from '@opchub/shared/api-domains';
import { adminMockNeeds, moderateMockNeeds } from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { mockAdminGuard } from './admin-guard';
import { parseBody, parseQuery, userIdOf } from './domain-util';
import { API } from './util';

/**
 * V4-609 (AD-07): Admin › Nhu cầu ở MSW — quyền menu `stores` (Gian hàng & Nhu cầu).
 * Nhu cầu Portal đăng trong phiên MSW không sang Admin (kho tách theo cổng); e2e dùng nhu cầu seed.
 */
export const adminNeedHandlers = [
  http.get(`${API}/admin/needs`, ({ request }) => {
    const denied = mockAdminGuard(request, 'stores.view');
    if (denied) return denied;
    const q = parseQuery(request.url, adminNeedQuerySchema);
    return q.ok ? HttpResponse.json(adminMockNeeds(q.data)) : q.res;
  }),
  ...(['hide', 'show'] as const).map((action) =>
    http.post(`${API}/admin/needs/${action}`, async ({ request }) => {
      const denied = mockAdminGuard(request, 'stores.action');
      if (denied) return denied;
      const body = await parseBody(request, adminNeedModerateSchema);
      if (!body.ok) return body.res;
      return HttpResponse.json(moderateMockNeeds(userIdOf(request), body.data.ids, action));
    }),
  ),
];
