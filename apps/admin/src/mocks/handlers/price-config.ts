import type { AdminPermissionKey } from '@opchub/shared';
import { priceConfigSaveSchema } from '@opchub/shared';
import {
  logSetting,
  mockAdminMeOf,
  readMockAdminPrices,
  readMockPrices,
  saveMockPrices,
} from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { parseBody, reply, userIdOf } from './domain-util';
import { API, apiError } from './util';

const can = (request: Request, key: AdminPermissionKey) =>
  mockAdminMeOf(userIdOf(request))?.permissions.includes(key) ?? false;
const forbidden = () => apiError(403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này');

/**
 * D-94 5A (§27 API): `GET/PUT /admin/price-config` (khoá `settings.general` như server) +
 * `GET /public/price-config` cho tab Chính sách Affiliate (giá gói theo cấu hình).
 */
export const priceConfigHandlers = [
  http.get(`${API}/public/price-config`, () => HttpResponse.json(readMockPrices())),
  http.get(`${API}/admin/price-config`, ({ request }) =>
    can(request, 'settings.general') ? HttpResponse.json(readMockAdminPrices()) : forbidden(),
  ),
  http.put(`${API}/admin/price-config`, async ({ request }) => {
    if (!can(request, 'settings.general')) return forbidden();
    const b = await parseBody(request, priceConfigSaveSchema);
    if (!b.ok) return b.res;
    const r = saveMockPrices(b.data);
    if (!r.ok) return reply(r);
    // Luật 10: nhật ký hoạt động tag `pricing` (như audit server)
    logSetting(
      userIdOf(request),
      'pricing.update',
      'price_config',
      'Cập nhật bảng giá',
      'pricing',
      {
        before: r.data.before,
        after: { per: r.data.saved.per, biz: r.data.saved.biz, fund: r.data.saved.fund },
      },
    );
    return HttpResponse.json(r.data.saved);
  }),
];
