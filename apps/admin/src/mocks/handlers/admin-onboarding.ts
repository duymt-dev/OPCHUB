import { onboardingMailSchema } from '@opchub/shared/api-domains';
import {
  getMockOnboardingMail,
  ONBOARDING_FLAG_COOKIE,
  remindMockOnboarding,
  saveMockOnboardingMail,
  syncOnboardingFlags,
} from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { mockAdminGuard } from './admin-guard';
import { param, parseBody, reply, userIdOf } from './domain-util';
import { API } from './util';

/** Cờ "khám phá" / "chia sẻ link" Portal ghi vào cookie chung (cùng host) → cột Khởi đầu */
export function syncOnboardingCookie(cookies: Record<string, string>): void {
  if (typeof document === 'undefined') return syncOnboardingFlags(cookies[ONBOARDING_FLAG_COOKIE]);
  const hit = document.cookie.split('; ').find((c) => c.startsWith(`${ONBOARDING_FLAG_COOKIE}=`));
  syncOnboardingFlags(hit?.slice(ONBOARDING_FLAG_COOKIE.length + 1));
}

/**
 * V4-611 (AD-02, D-88): "Nhắc" ở Admin › Thành viên (`members.action`) + mẫu email nhắc ở Email
 * tự động (`settings.mail`). Như server: 204; 409 đã đủ 8 bước; 429 đã nhắc trong 24 giờ.
 */
export const adminOnboardingHandlers = [
  http.post(`${API}/admin/users/:id/onboarding-remind`, ({ request, params, cookies }) => {
    const denied = mockAdminGuard(request, 'members.action');
    if (denied) return denied;
    syncOnboardingCookie(cookies);
    const r = remindMockOnboarding(userIdOf(request), param(params, 'id'));
    return r.ok ? new HttpResponse(null, { status: 204 }) : reply(r);
  }),
  http.get(`${API}/admin/mail/onboarding`, ({ request }) => {
    const denied = mockAdminGuard(request, 'settings.mail');
    return denied ?? HttpResponse.json(getMockOnboardingMail());
  }),
  http.put(`${API}/admin/mail/onboarding`, async ({ request }) => {
    const denied = mockAdminGuard(request, 'settings.mail');
    if (denied) return denied;
    const body = await parseBody(request, onboardingMailSchema);
    if (!body.ok) return body.res;
    return HttpResponse.json(saveMockOnboardingMail(userIdOf(request), body.data));
  }),
];
