import { onboardingFlagParamSchema } from '@opchub/shared/api-domains';
import {
  myMockOnboarding,
  ONBOARDING_FLAG_COOKIE,
  onboardingFlagCookie,
  setMockOnboardingFlag,
  syncOnboardingFlags,
} from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { param, userIdOf } from './domain-util';
import { API, apiError } from './util';

/** Cờ "khám phá" / "chia sẻ link" sống qua tải lại trang + sang Admin (cùng host, cookie) */
function readCookie(cookies: Record<string, string>): string | undefined {
  if (typeof document === 'undefined') return cookies[ONBOARDING_FLAG_COOKIE];
  const hit = document.cookie.split('; ').find((c) => c.startsWith(`${ONBOARDING_FLAG_COOKIE}=`));
  return hit?.slice(ONBOARDING_FLAG_COOKIE.length + 1);
}

/** V4-611 Hướng dẫn bắt đầu (MSW) — như server: NĐT 204, cờ idempotent 204 */
export const onboardingHandlers = [
  http.get(`${API}/me/onboarding`, ({ request, cookies }) => {
    syncOnboardingFlags(readCookie(cookies));
    const o = myMockOnboarding(userIdOf(request));
    return o ? HttpResponse.json(o) : new HttpResponse(null, { status: 204 });
  }),
  http.post(`${API}/me/onboarding/flags/:key`, ({ request, params, cookies }) => {
    const key = onboardingFlagParamSchema.safeParse(param(params, 'key'));
    if (!key.success) return apiError(404, 'NOT_FOUND', 'Không tìm thấy bước khởi đầu');
    syncOnboardingFlags(readCookie(cookies));
    setMockOnboardingFlag(userIdOf(request), key.data);
    const res = new HttpResponse(null, { status: 204 });
    if (typeof document === 'undefined') res.headers.append('Set-Cookie', onboardingFlagCookie());
    else document.cookie = onboardingFlagCookie();
    return res;
  }),
];
