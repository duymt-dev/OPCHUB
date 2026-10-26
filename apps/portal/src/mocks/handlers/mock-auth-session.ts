import { meSchema, type Me } from '@opchub/shared/api';
import { ACCOUNT_LOCKED_MESSAGE, accountLockedUntilMessage } from '@opchub/shared';
import {
  mockMemberAccessToken,
  mockMemberEpoch,
  mockLockedUntil,
  mockMemberStatus,
  mockNeedsDeclaration,
  sweepMockExpiredLocks,
  registerMockSessionMember,
} from '@opchub/shared/mock-domains';
import { z } from 'zod';
import { http, HttpResponse } from 'msw/http';
import { API, apiError } from './util';

/** Fake backend session, only registered by MSW. No real access/refresh credential is
 * persisted. A real server supplies its own HttpOnly refresh cookie instead.
 */
const COOKIE = 'opchub-msw-session';
const refreshStateSchema = z.union([
  z.object({ me: meSchema, epoch: z.number().int().nonnegative() }),
  meSchema.transform((me) => ({ me, epoch: 0 })),
]);
function cookieHeader(value: string, clear = false) {
  return `${COOKIE}=${value}; Path=/; SameSite=Lax${clear ? '; Max-Age=0' : ''}`;
}
export function mockSessionResponse(me: Me, existing = false) {
  // V4-612 (§26.6): hết hạn khoá → tự mở khi đăng nhập; khoá có hạn báo "khóa đến dd/mm/yyyy"
  sweepMockExpiredLocks();
  const status = mockMemberStatus(me.id, me.status);
  if (status === 'locked') {
    const until = mockLockedUntil(me.id);
    const msg = until ? accountLockedUntilMessage(new Date(until)) : ACCOUNT_LOCKED_MESSAGE;
    return apiError(403, 'FORBIDDEN', msg);
  }
  registerMockSessionMember(me.id, status);
  // V4-607: cờ khai báo đọc lại từ kho mock (cookie có thể giữ giá trị cũ)
  const current = { ...me, status, needsDeclaration: mockNeedsDeclaration(me.id) };
  const cookie = cookieHeader(
    encodeURIComponent(JSON.stringify({ me: current, epoch: mockMemberEpoch(me.id) })),
  );
  // Browsers discard Set-Cookie from a service-worker response; mirror the fake cookie.
  if (typeof document !== 'undefined') document.cookie = cookie;
  return HttpResponse.json(
    {
      ...(existing ? { status: 'existing' } : {}),
      accessToken: mockMemberAccessToken(me.id),
      me: current,
    },
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
      const state = refreshStateSchema.safeParse(JSON.parse(decodeURIComponent(raw)) as unknown);
      if (
        !state.success ||
        mockMemberStatus(state.data.me.id) === 'locked' ||
        state.data.epoch !== mockMemberEpoch(state.data.me.id)
      )
        return apiError(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập');
      return mockSessionResponse(state.data.me);
    } catch {
      return apiError(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập');
    }
  }),
];
