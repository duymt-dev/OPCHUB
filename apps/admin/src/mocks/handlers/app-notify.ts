import { http, HttpResponse } from 'msw/http';
import {
  appNotifySettingsSchema,
  appNotifyPatchSchema,
  DEFAULT_APP_NOTIFY,
  pushSubscribeSchema,
  pushUnsubscribeSchema,
} from '@opchub/shared/api-domains';
import {
  logSetting,
  mockAppTestNotification,
  mockPushConfig,
  mockPushDeviceCount,
  mockSubscribePush,
  mockUnsubscribePush,
} from '@opchub/shared/mock-domains';
import { mockAdminGuard } from './admin-guard';
import { parseBody, userIdOf } from './domain-util';
import { API, apiError } from './util';
const KEY = 'opchub-mock-app-notify';
let memory = structuredClone(DEFAULT_APP_NOTIFY);
function current() {
  try {
    const hit = appNotifySettingsSchema.safeParse(
      JSON.parse(sessionStorage.getItem(KEY) ?? 'null'),
    );
    if (hit.success) return hit.data;
  } catch {
    /* In-memory tests / disabled storage. */
  }
  return memory;
}
export const appNotifyHandlers = [
  http.get(`${API}/push/config`, ({ request }) =>
    request.headers.has('Authorization')
      ? HttpResponse.json({ ...mockPushConfig(), enabled: current().pwa, kinds: current().push })
      : apiError(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập'),
  ),
  http.post(`${API}/push/subscriptions`, async ({ request }) => {
    if (!request.headers.has('Authorization'))
      return apiError(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập');
    if (!current().pwa) return apiError(409, 'CONFLICT', 'Ứng dụng & thông báo đang tắt');
    const body = await parseBody(request, pushSubscribeSchema);
    if (!body.ok) return body.res;
    return HttpResponse.json(mockSubscribePush('admin', userIdOf(request), body.data.endpoint), {
      status: 201,
    });
  }),
  http.delete(`${API}/push/subscriptions`, async ({ request }) => {
    if (!request.headers.has('Authorization'))
      return apiError(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập');
    const body = await parseBody(request, pushUnsubscribeSchema);
    if (!body.ok) return body.res;
    return HttpResponse.json(mockUnsubscribePush('admin', userIdOf(request), body.data.endpoint));
  }),
  http.get(
    `${API}/admin/settings/app`,
    ({ request }) => mockAdminGuard(request, 'settings.general') ?? HttpResponse.json(current()),
  ),
  http.patch(`${API}/admin/settings/app`, async ({ request }) => {
    const denied = mockAdminGuard(request, 'settings.general');
    if (denied) return denied;
    const body = await parseBody(request, appNotifyPatchSchema);
    if (!body.ok) return body.res;
    const before = current();
    memory = appNotifySettingsSchema.parse({
      pwa: body.data.pwa ?? before.pwa,
      push: { ...before.push, ...body.data.push },
    });
    try {
      sessionStorage.setItem(KEY, JSON.stringify(memory));
    } catch {
      /* Memory remains usable. */
    }
    logSetting(
      userIdOf(request),
      'settings.app',
      'settings',
      'Đã lưu cấu hình ứng dụng & thông báo',
      'settings',
    );
    return HttpResponse.json(memory);
  }),
  http.post(`${API}/admin/settings/app/test`, ({ request }) => {
    const denied = mockAdminGuard(request, 'settings.general');
    if (denied) return denied;
    mockAppTestNotification(userIdOf(request));
    logSetting(userIdOf(request), 'settings.app_test', 'settings', 'Gửi thông báo thử', 'settings');
    return HttpResponse.json(
      { ok: true, deviceCount: mockPushDeviceCount('admin', userIdOf(request)) },
      { status: 201 },
    );
  }),
];
