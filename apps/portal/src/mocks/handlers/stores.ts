import {
  storeFavoriteSchema,
  storePublicPatchSchema,
  storeListQuerySchema,
  storeUpsertSchema,
} from '@opchub/shared/api-domains';
import {
  favoriteMockStore,
  myMockStorePublic,
  patchMockStorePublic,
  mockStorePublicPage,
  mockStorePublicCookie,
  syncMockStorePublic,
  STORE_PUBLIC_COOKIE,
  listMockStores,
  mockStoreDetail,
  myMockStore,
  myMockStoreDashboard,
  restoreMockStoreFavs,
  saveMockStore,
  STORE_BRIDGE_COOKIE,
  storeBridgeCookie,
  stepMockStore,
  syncStoreBridge,
} from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { param, parseBody, reply, userIdOf } from './domain-util';
import { persistMockStoreFav, readMockStoreFavs } from './store-fav-storage';
import { API } from './util';

/**
 * V4-608 Gian hàng địa phương (MSW). Trạng thái chung với Admin qua cookie `opchub-mock-st`
 * (cùng host, khác cổng — đọc thẳng `document.cookie` như cầu Gói Gọi vốn).
 */
function readCookie(cookies: Record<string, string>): string | undefined {
  if (typeof document === 'undefined') return cookies[STORE_BRIDGE_COOKIE];
  const hit = document.cookie.split('; ').find((c) => c.startsWith(`${STORE_BRIDGE_COOKIE}=`));
  return hit?.slice(STORE_BRIDGE_COOKIE.length + 1);
}

function withBridge(cookies: Record<string, string>, res: Response, id: string): Response {
  const c = storeBridgeCookie(readCookie(cookies), [id]);
  if (typeof document === 'undefined') res.headers.append('Set-Cookie', c);
  else document.cookie = c;
  return res;
}

/** `audience=a&audience=b` hoặc `audience=a,b` như server */
function listQuery(url: string) {
  const sp = new URL(url).searchParams;
  const multi = (k: string) =>
    sp
      .getAll(k)
      .flatMap((v) => v.split(','))
      .filter(Boolean);
  return storeListQuerySchema.parse({
    q: sp.get('q') ?? undefined,
    kind: sp.get('kind') ?? undefined,
    audience: multi('audience'),
    field: multi('field'),
    province: multi('province'),
    sort: sp.get('sort') ?? undefined,
    page: sp.get('page') ?? undefined,
  });
}

export const storeHandlers = [
  http.get(`${API}/public/stores/:slug`, ({ params, cookies }) =>
    reply(
      mockStorePublicPage(
        param(params, 'slug'),
        cookies[STORE_PUBLIC_COOKIE],
        cookies[STORE_BRIDGE_COOKIE],
      ),
    ),
  ),
  http.get(`${API}/me/store/public`, ({ request }) =>
    reply(myMockStorePublic(userIdOf(request), new URL(request.url).origin)),
  ),
  http.patch(`${API}/me/store/public`, async ({ request, cookies }) => {
    const body = await parseBody(request, storePublicPatchSchema);
    if (!body.ok) return body.res;
    const r = patchMockStorePublic(userIdOf(request), new URL(request.url).origin, body.data);
    if (r.ok && typeof document !== 'undefined')
      document.cookie = mockStorePublicCookie(cookies[STORE_PUBLIC_COOKIE], r.data.slug, {
        seoIndex: r.data.seoIndex,
        title: r.data.title,
        desc: r.data.desc,
      });
    return reply(r);
  }),
  http.all(`${API}/*`, ({ cookies, request }) => {
    syncStoreBridge(readCookie(cookies));
    syncMockStorePublic(cookies[STORE_PUBLIC_COOKIE]);
    const me = userIdOf(request);
    restoreMockStoreFavs(me, readMockStoreFavs(me));
    return undefined;
  }),
  http.get(`${API}/stores`, ({ request }) =>
    HttpResponse.json(listMockStores(listQuery(request.url), userIdOf(request))),
  ),
  http.put(`${API}/stores/:id/favorite`, async ({ request, params }) => {
    const body = await parseBody(request, storeFavoriteSchema);
    if (!body.ok) return body.res;
    const me = userIdOf(request);
    const r = favoriteMockStore(param(params, 'id'), me, body.data.on);
    if (r.ok) persistMockStoreFav(me, param(params, 'id'), body.data.on);
    return reply(r);
  }),
  http.get(`${API}/stores/:id`, ({ request, params }) =>
    reply(mockStoreDetail(param(params, 'id'), userIdOf(request))),
  ),
  http.get(`${API}/me/store`, ({ request }) => reply(myMockStore(userIdOf(request)))),
  http.get(`${API}/me/store/dashboard`, ({ request }) =>
    reply(myMockStoreDashboard(userIdOf(request))),
  ),
  http.put(`${API}/me/store`, async ({ request }) => {
    const body = await parseBody(request, storeUpsertSchema);
    if (!body.ok) return body.res;
    return reply(saveMockStore(userIdOf(request), body.data));
  }),
  ...(['publish', 'unpublish'] as const).map((a) =>
    http.post(`${API}/me/store/${a}`, ({ request, cookies }) => {
      const r = stepMockStore(userIdOf(request), a === 'publish' ? 'published' : 'draft');
      return r.ok ? withBridge(cookies, reply(r), r.data.id) : reply(r);
    }),
  ),
];
