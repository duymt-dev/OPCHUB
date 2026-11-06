import {
  renewalSettingsPatchSchema,
  renewalSettingsSchema,
  renewalListSchema,
  renewalQuerySchema,
  renewalSendSchema,
  renewalSendResultSchema,
} from '@opchub/shared/api-domains';
import {
  mockAdminMeOf,
  mockRenewalConfig,
  patchMockRenewal,
  mockRenewalList,
  sendMockRenewal,
  seedMockRenewalDemo,
} from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { parseBody, parseQuery, userIdOf } from './domain-util';
import { API, apiError } from './util';
const allowed = (r: Request) =>
  mockAdminMeOf(userIdOf(r))?.permissions.includes('settings.mail') ?? false;
const denied = () => apiError(403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này');
function restore() {
  if (typeof document !== 'undefined' && document.cookie.includes('opchub-mock-renewal-demo=1'))
    seedMockRenewalDemo();
}
export const renewalHandlers = [
  http.get(`${API}/admin/settings/renewal`, ({ request }) => {
    if (!allowed(request)) return denied();
    restore();
    return HttpResponse.json(renewalSettingsSchema.parse(mockRenewalConfig()));
  }),
  http.patch(`${API}/admin/settings/renewal`, async ({ request }) => {
    if (!allowed(request)) return denied();
    const b = await parseBody(request, renewalSettingsPatchSchema);
    if (!b.ok) return b.res;
    restore();
    const saved = patchMockRenewal(userIdOf(request), b.data);
    return HttpResponse.json(renewalSettingsSchema.parse(saved));
  }),
  http.get(`${API}/admin/renewal/members`, ({ request }) => {
    if (!allowed(request)) return denied();
    const q = parseQuery(request.url, renewalQuerySchema);
    if (!q.ok) return q.res;
    restore();
    return HttpResponse.json(renewalListSchema.parse(mockRenewalList(q.data)));
  }),
  http.post(`${API}/admin/renewal/send`, async ({ request }) => {
    if (!allowed(request)) return denied();
    const b = await parseBody(request, renewalSendSchema);
    if (!b.ok) return b.res;
    restore();
    const result = sendMockRenewal(userIdOf(request), b.data);
    return result
      ? HttpResponse.json(renewalSendResultSchema.parse(result))
      : apiError(422, 'RENEWAL_NO_CHANNEL', 'Bật ít nhất 1 kênh gửi');
  }),
];
