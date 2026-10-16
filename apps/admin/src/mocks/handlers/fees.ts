import { feeBulkCollectSchema, feeExportSchema } from '@opchub/shared/api-domains';
import { collectFees, exportFeesCsv, feeSummary, remindAllFees } from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { parseBody } from './domain-util';
import { API } from './util';

/**
 * Bổ sung SRS §13 cho màn Phí thành viên (Q-G4b-1). Đường dẫn một đoạn (`/admin/fees/collect`)
 * không trùng `/admin/fees/:uid/:action`. Thao tác ghi → audit_logs ở BE (luật 10).
 */
export const feeHandlers = [
  http.get(`${API}/admin/fees/summary`, () => HttpResponse.json(feeSummary())),
  http.post(`${API}/admin/fees/collect`, async ({ request }) => {
    const body = await parseBody(request, feeBulkCollectSchema);
    if (!body.ok) return body.res;
    return HttpResponse.json(collectFees(body.data.userIds));
  }),
  http.post(`${API}/admin/fees/remind-all`, () =>
    HttpResponse.json(remindAllFees(), { status: 202 }),
  ),
  http.post(`${API}/admin/fees/export`, async ({ request }) => {
    const body = await parseBody(request, feeExportSchema);
    if (!body.ok) return body.res;
    return HttpResponse.json(exportFeesCsv(body.data.userIds));
  }),
];
