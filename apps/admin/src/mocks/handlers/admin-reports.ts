import {
  type ExportStatus,
  type ReportParams,
  reportFileName,
  reportParamsSchema,
  reportPreviewQuerySchema,
} from '@opchub/shared/api-domains';
import {
  mockReportMonthNow,
  mockReportPreview,
  mockReportScopes,
  nextId,
} from '@opchub/shared/mock-domains';
import { reportCsv } from '@opchub/shared/reports';
import { http, HttpResponse } from 'msw/http';
import { mockAdminGuard } from './admin-guard';
import { param, parseBody, parseQuery, reply } from './domain-util';
import { apiError, API } from './util';

/**
 * V4-614 (D-78) Admin › Báo cáo ở MSW: phạm vi, xem trước, job xuất `kind = report` (lần hỏi đầu
 * `running`, sau đó `done`) — CSV dựng bằng đúng khuôn `@opchub/shared/reports` như worker.
 * Link tải giả `/exports/report/:id/:file` để `downloadUrl` lấy tên file không dấu.
 */
const jobs = new Map<string, { params: ReportParams; file: string; csv: string; polls: number }>();

const future = (p: ReportParams) =>
  p.month > mockReportMonthNow()
    ? apiError(400, 'VALIDATION_ERROR', 'Chưa thể báo cáo tháng chưa diễn ra')
    : null;

function status(id: string, origin: string): ExportStatus | null {
  const job = jobs.get(id);
  if (!job) return null;
  job.polls += 1;
  const base = { id, kind: 'report' as const };
  if (job.polls < 2)
    return { ...base, status: 'running', rowCount: null, url: null, expiresInSec: null };
  return {
    ...base,
    status: 'done',
    rowCount: 1,
    url: `${origin}${API}/exports/report/${id}/${job.file}`,
    expiresInSec: 3600,
  };
}

export const adminReportHandlers = [
  http.get(`${API}/admin/reports/scopes`, ({ request }) => {
    const denied = mockAdminGuard(request, 'reports.view');
    return denied ?? HttpResponse.json(mockReportScopes());
  }),
  http.get(`${API}/admin/reports/preview`, ({ request }) => {
    const denied = mockAdminGuard(request, 'reports.view');
    if (denied) return denied;
    const q = parseQuery(request.url, reportPreviewQuerySchema);
    if (!q.ok) return q.res;
    return future(q.data) ?? reply(mockReportPreview(q.data));
  }),
  http.post(`${API}/admin/reports/export`, async ({ request }) => {
    const denied = mockAdminGuard(request, 'reports.view');
    if (denied) return denied;
    const body = await parseBody(request, reportParamsSchema);
    if (!body.ok) return body.res;
    const bad = future(body.data);
    if (bad) return bad;
    const r = mockReportPreview(body.data);
    if (!r.ok) return reply(r);
    const jobId = nextId('job');
    const file = reportFileName(body.data.template, body.data.month, r.data.scope);
    jobs.set(jobId, { params: body.data, file, csv: reportCsv(r.data), polls: 0 });
    return HttpResponse.json({ jobId, status: 'queued' as const }, { status: 202 });
  }),
  // Job khác (thành viên, nhóm) → trả `undefined` cho handler admin-members xử lý
  http.get(`${API}/admin/exports/:id`, ({ params, request }) => {
    const s = status(param(params, 'id'), new URL(request.url).origin);
    return s ? HttpResponse.json(s) : undefined;
  }),
  http.get(`${API}/exports/report/:id/:file`, ({ params }) => {
    const job = jobs.get(param(params, 'id'));
    if (!job) return apiError(404, 'NOT_FOUND', 'Không có tệp');
    return new HttpResponse(job.csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8' } });
  }),
];
