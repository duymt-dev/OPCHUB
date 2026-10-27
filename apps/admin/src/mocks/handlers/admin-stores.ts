import {
  adminStoreFeaturedSchema,
  adminStoreModerateSchema,
  adminStoreQuerySchema,
} from '@opchub/shared/api-domains';
import {
  adminMockStore,
  adminMockStores,
  featureMockStore,
  moderateMockStores,
  STORE_BRIDGE_COOKIE,
  storeBridgeCookie,
  syncStoreBridge,
} from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { mockAdminGuard } from './admin-guard';
import { param, parseBody, parseQuery, reply, userIdOf } from './domain-util';
import { API } from './util';

/**
 * V4-608 (AD-07): Admin › Gian hàng ở MSW. Trạng thái Portal vừa xuất bản / về nháp đến qua cookie
 * `opchub-mock-st` (cùng host, khác cổng — đọc `document.cookie`); ẩn / hiện chép ngược lại.
 */
function readCookie(cookies: Record<string, string>): string | undefined {
  if (typeof document === 'undefined') return cookies[STORE_BRIDGE_COOKIE];
  const hit = document.cookie.split('; ').find((c) => c.startsWith(`${STORE_BRIDGE_COOKIE}=`));
  return hit?.slice(STORE_BRIDGE_COOKIE.length + 1);
}

export const adminStoreHandlers = [
  http.all(`${API}/*`, ({ cookies }) => {
    syncStoreBridge(readCookie(cookies));
    return undefined;
  }),
  http.get(`${API}/admin/stores`, ({ request }) => {
    const denied = mockAdminGuard(request, 'stores.view');
    if (denied) return denied;
    const q = parseQuery(request.url, adminStoreQuerySchema);
    return q.ok ? HttpResponse.json(adminMockStores(q.data)) : q.res;
  }),
  http.get(`${API}/admin/stores/:id`, ({ request, params }) => {
    const denied = mockAdminGuard(request, 'stores.view');
    return denied ?? reply(adminMockStore(param(params, 'id')));
  }),
  // D-89 (P-105): gắn / gỡ "Nổi bật"
  http.put(`${API}/admin/stores/:id/featured`, async ({ request, params }) => {
    const denied = mockAdminGuard(request, 'stores.action');
    if (denied) return denied;
    const body = await parseBody(request, adminStoreFeaturedSchema);
    if (!body.ok) return body.res;
    return reply(featureMockStore(param(params, 'id'), body.data.featured));
  }),
  ...(['hide', 'show'] as const).map((action) =>
    http.post(`${API}/admin/stores/${action}`, async ({ request, cookies }) => {
      const denied = mockAdminGuard(request, 'stores.action');
      if (denied) return denied;
      const body = await parseBody(request, adminStoreModerateSchema);
      if (!body.ok) return body.res;
      const r = moderateMockStores(userIdOf(request), body.data.ids, action);
      const res = HttpResponse.json(r);
      const c = storeBridgeCookie(readCookie(cookies), body.data.ids);
      if (typeof document === 'undefined') res.headers.append('Set-Cookie', c);
      else document.cookie = c;
      return res;
    }),
  ),
];
