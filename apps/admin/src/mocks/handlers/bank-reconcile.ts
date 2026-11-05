import { http, HttpResponse } from 'msw/http';
import {
  bankSettingsSchema,
  bankSettingsPatchSchema,
  bankTxnQuerySchema,
  bankTxnPageSchema,
  bankShortSchema,
  bankKeyRotateResultSchema,
  bankTestResultSchema,
  bankSimulateResultSchema,
  feeExportResponseSchema,
} from '@opchub/shared/api-domains';
import {
  mockAdminMeOf,
  mockBankConfig,
  patchMockBank,
  rotateMockBank,
  listMockBank,
  shortMockBank,
  simulateMockBank,
  recordAudit,
} from '@opchub/shared/mock-domains';
import { parseBody, parseQuery, param, userIdOf } from './domain-util';
import { API, apiError } from './util';
const BASE = `${API}/admin/settings/bank`;
const allowed = (r: Request, ...keys: string[]) =>
  keys.some((key) => mockAdminMeOf(userIdOf(r))?.permissions.some((p) => p === key));
const denied = () => apiError(403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này');
export const bankHandlers = [
  http.get(BASE, ({ request }) =>
    allowed(request, 'settings.general')
      ? HttpResponse.json(bankSettingsSchema.parse(mockBankConfig()))
      : denied(),
  ),
  http.patch(BASE, async ({ request }) => {
    if (!allowed(request, 'settings.general')) return denied();
    const b = await parseBody(request, bankSettingsPatchSchema);
    return b.ok
      ? HttpResponse.json(
          bankSettingsSchema.parse(patchMockBank(userIdOf(request), b.data.autoActivate)),
        )
      : b.res;
  }),
  http.post(`${BASE}/key`, ({ request }) =>
    allowed(request, 'settings.general')
      ? HttpResponse.json(bankKeyRotateResultSchema.parse(rotateMockBank(userIdOf(request))))
      : denied(),
  ),
  http.get(`${BASE}/transactions`, ({ request }) => {
    if (!allowed(request, 'fees.view', 'settings.general')) return denied();
    const q = parseQuery(request.url, bankTxnQuerySchema);
    return q.ok ? HttpResponse.json(bankTxnPageSchema.parse(listMockBank(q.data))) : q.res;
  }),
  http.post(`${BASE}/transactions/:id/short`, async ({ request, params }) => {
    if (!allowed(request, 'fees.action')) return denied();
    const b = await parseBody(request, bankShortSchema);
    if (!b.ok) return b.res;
    return shortMockBank(userIdOf(request), param(params, 'id'), b.data.note)
      ? new HttpResponse(null, { status: 204 })
      : apiError(409, 'CONFLICT', 'Giao dịch không còn ở trạng thái chưa khớp');
  }),
  http.post(`${BASE}/test`, ({ request }) =>
    allowed(request, 'settings.general')
      ? HttpResponse.json(bankTestResultSchema.parse({ provider: 'fake', received: 0 }))
      : denied(),
  ),
  http.post(`${BASE}/simulate`, ({ request }) =>
    allowed(request, 'settings.general')
      ? HttpResponse.json(bankSimulateResultSchema.parse(simulateMockBank(userIdOf(request))))
      : denied(),
  ),
  http.post(`${BASE}/export`, ({ request }) => {
    if (!allowed(request, 'fees.action')) return denied();
    const rows = listMockBank({ limit: Number.MAX_SAFE_INTEGER }).items;
    const labels = {
      matched: 'Đã khớp · tự kích hoạt',
      manual: 'Gán thủ công',
      unmatched: 'Không khớp nội dung',
      short: 'Thiếu tiền',
    };
    const cell = (v: string | number) => {
      const s = String(v),
        safe = /^[\s]*[=+\-@\t\r]/.test(s) ? `'${s}` : s;
      return `"${safe.replaceAll('"', '""')}"`;
    };
    const csv =
      '\uFEFFThời gian,Số tiền,Nội dung,Thành viên,Trạng thái\n' +
      rows
        .map((r) =>
          [
            new Date(r.receivedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
            r.amount,
            r.content,
            r.memberName ?? '',
            r.shortRecorded ? 'Thiếu tiền · đã ghi nhận' : labels[r.status],
          ]
            .map(cell)
            .join(','),
        )
        .join('\n');
    recordAudit(userIdOf(request), 'fee.bank_export', 'bank', 'Xuất CSV đối soát ngân hàng', {
      count: rows.length,
    });
    return HttpResponse.json(
      feeExportResponseSchema.parse({ filename: 'doi-soat-ngan-hang.csv', csv }),
    );
  }),
];
