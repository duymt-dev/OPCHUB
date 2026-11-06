import { http, HttpResponse } from 'msw/http';
import {
  appNotifySettingsSchema,
  appNotifyPatchSchema,
  DEFAULT_APP_NOTIFY,
} from '@opchub/shared/api-domains';
import { logSetting, mockAppTestNotification } from '@opchub/shared/mock-domains';
import { mockAdminGuard } from './admin-guard';
import { parseBody, userIdOf } from './domain-util';
import { API } from './util';
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
    return HttpResponse.json({ ok: true }, { status: 201 });
  }),
];
