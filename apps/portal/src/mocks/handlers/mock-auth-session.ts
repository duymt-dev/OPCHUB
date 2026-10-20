import { meSchema, type Me } from '@opchub/shared/api';
import { http, HttpResponse } from 'msw/http';
import { API, apiError } from './util';

/** Fake backend session, only registered by MSW. No real access/refresh credential is
 * persisted. A real server supplies its own HttpOnly refresh cookie instead.
 */
const COOKIE = 'opchub-msw-session';
function cookieHeader(value: string, clear = false) {
  return `${COOKIE}=${value}; Path=/; SameSite=Lax${clear ? '; Max-Age=0' : ''}`;
}
export function mockSessionResponse(me: Me, existing = false) {
  const cookie = cookieHeader(encodeURIComponent(JSON.stringify(me)));
  // Browsers discard Set-Cookie from a service-worker response; mirror the fake cookie.
  if (typeof document !== 'undefined') document.cookie = cookie;
  return HttpResponse.json(
    { ...(existing ? { status: 'existing' } : {}), accessToken: `mock.${me.id}`, me },
    {
      headers: { 'Set-Cookie': cookie },
    },
  );
}
export function clearMockSession() {
  const cookie = cookieHeader('', true);
  if (typeof document !== 'undefined') document.cookie = cookie;
  return new HttpResponse(null, { status: 204, headers: { 'Set-Cookie': cookie } });
}
export const mockRefreshHandlers = [
  http.post(`${API}/auth/refresh`, ({ cookies }) => {
    try {
      const raw = cookies[COOKIE];
      if (!raw) return apiError(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập');
      const me = meSchema.safeParse(JSON.parse(decodeURIComponent(raw)) as unknown);
      return me.success
        ? mockSessionResponse(me.data)
        : apiError(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập');
    } catch {
      return apiError(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập');
    }
  }),
];
