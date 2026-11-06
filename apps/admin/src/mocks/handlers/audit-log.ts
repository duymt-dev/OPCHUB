import {
  auditLogPageQuerySchema,
  auditLogPageSchema,
  exportStatusSchema,
} from '@opchub/shared/api-domains';
import {
  mockAuditLogPage,
  mockAuditCsv,
  logSetting,
  mockDb,
  nextId,
} from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { mockAdminGuard } from './admin-guard';
import { parseQuery, param, userIdOf } from './domain-util';
import { API, apiError } from './util';

type Job = { actor: string; csv: string; rows: number; polls: number };
const stores = new WeakMap<ReturnType<typeof mockDb>, Map<string, Job>>();
const jobs = () => {
  const db = mockDb();
  let s = stores.get(db);
  if (!s) {
    s = new Map();
    stores.set(db, s);
  }
  return s;
};
export const auditLogHandlers = [
  http.get(`${API}/admin/audit-logs`, ({ request }) => {
    const denied = mockAdminGuard(request, 'settings.log');
    if (denied) return denied;
    const q = parseQuery(request.url, auditLogPageQuerySchema);
    return q.ok ? HttpResponse.json(auditLogPageSchema.parse(mockAuditLogPage(q.data))) : q.res;
  }),
  http.post(`${API}/admin/audit-logs/export`, ({ request }) => {
    const denied = mockAdminGuard(request, 'settings.log');
    if (denied) return denied;
    const actor = userIdOf(request),
      jobId = nextId('audit-job');
    logSetting(actor, 'export.audit', jobId, 'xuất nhật ký hoạt động 90 ngày', 'settings');
    jobs().set(jobId, { actor, ...mockAuditCsv(), polls: 0 });
    return HttpResponse.json({ jobId, status: 'queued' }, { status: 202 });
  }),
  http.get(`${API}/admin/exports/:id`, ({ request, params }) => {
    const job = jobs().get(param(params, 'id'));
    if (!job) return undefined;
    if (job.actor !== userIdOf(request)) return apiError(404, 'NOT_FOUND', 'Không có yêu cầu xuất');
    job.polls++;
    const done = job.polls >= 2;
    return HttpResponse.json(
      exportStatusSchema.parse({
        id: param(params, 'id'),
        kind: 'audit',
        status: done ? 'done' : 'running',
        rowCount: done ? job.rows : null,
        url: done
          ? `${new URL(request.url).origin}${API}/exports/audit/${param(params, 'id')}/nhat-ky-hoat-dong.csv`
          : null,
        expiresInSec: done ? 3600 : null,
      }),
    );
  }),
  http.get(`${API}/exports/audit/:id/:file`, ({ params }) => {
    const job = jobs().get(param(params, 'id'));
    return job
      ? new HttpResponse(job.csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8' } })
      : apiError(404, 'NOT_FOUND', 'Không có tệp');
  }),
];
