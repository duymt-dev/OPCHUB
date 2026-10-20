import {
  getSecuritySettings,
  listMockAdminAccounts,
  mockAdminMeOf,
} from '@opchub/shared/mock-domains';
import { HttpResponse } from 'msw/http';
import { z } from 'zod';
import { apiError } from './util';

/** MSW only: a fake account id, never a real access/refresh credential or stored permissions. */
const COOKIE = 'opchub-msw-admin-session';
const idSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[A-Za-z0-9_-]+$/);
const expired = () => apiError(401, 'UNAUTHORIZED', 'Phiên đã hết hạn');
const header = (value: string, clear = false) =>
  `${COOKIE}=${value}; Path=/; SameSite=Lax${clear ? '; Max-Age=0' : ''}`;

export function mockAdminSessionResponse(id: string) {
  const account = listMockAdminAccounts().find((row) => row.id === id);
  const admin = mockAdminMeOf(id, getSecuritySettings().requireAdmin2fa);
  if (!admin || account?.status !== 'active') return expired();
  const cookie = header(encodeURIComponent(id));
  // Set-Cookie from a worker response is not persisted by browsers; mirror fake state only.
  if (typeof document !== 'undefined') document.cookie = cookie;
  return HttpResponse.json(
    { accessToken: `mock.${id}`, admin },
    { headers: { 'Set-Cookie': cookie } },
  );
}

export function refreshMockAdminSession(cookies: Record<string, string>) {
  const raw =
    typeof document === 'undefined'
      ? cookies[COOKIE]
      : document.cookie
          .split('; ')
          .find((value) => value.startsWith(`${COOKIE}=`))
          ?.slice(COOKIE.length + 1);
  const parsed = idSchema.safeParse(raw);
  return parsed.success ? mockAdminSessionResponse(parsed.data) : expired();
}

export function clearMockAdminSession() {
  const cookie = header('', true);
  if (typeof document !== 'undefined') document.cookie = cookie;
  return new HttpResponse(null, { status: 204, headers: { 'Set-Cookie': cookie } });
}
