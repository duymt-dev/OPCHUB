import { http, HttpResponse } from 'msw/http';
import {
  aiCallsQuerySchema,
  aiCallsFilterSchema,
  aiComposeSchema,
  aiComposeResponseSchema,
} from '@opchub/shared/api-domains';
import {
  mockAiCall,
  mockAiCallsPage,
  mockAiCallsCsv,
  logSetting,
  nextId,
} from '@opchub/shared/mock-domains';
import { mockAdminGuard } from './admin-guard';
import { mockAiConfiguration } from './ai-providers';
import { parseBody, parseQuery, param, userIdOf } from './domain-util';
import { API, apiError } from './util';

const jobs = new Map<string, { actor: string; csv: string; rows: number }>();
const configured = () => {
  const cfg = mockAiConfiguration();
  return cfg.providers.some((p) => p.id === cfg.use.content && p.enabled && p.hasKey);
};
export const aiOpsHandlers = [
  http.get(
    `${API}/admin/ai/config`,
    ({ request }) =>
      mockAdminGuard(request, 'settings.mail') ?? HttpResponse.json({ compose: configured() }),
  ),
  http.post(`${API}/admin/ai/compose`, async ({ request }) => {
    const denied = mockAdminGuard(request, 'settings.mail');
    if (denied) return denied;
    const body = await parseBody(request, aiComposeSchema);
    if (!body.ok) return body.res;
    if (body.data.kind !== 'campaign_body') return apiError(403, 'FORBIDDEN', 'Bạn không có quyền');
    if (!configured()) return apiError(409, 'CONFLICT', 'not_configured');
    const actor = userIdOf(request);
    const cfg = mockAiConfiguration();
    const provider = cfg.providers.find((p) => p.id === cfg.use.content);
    if (!provider) return apiError(409, 'CONFLICT', 'not_configured');
    mockAiCall(actor, 'admin', {
      provider: provider.id,
      model: cfg.models?.content ?? provider.model,
    });
    logSetting(actor, 'llm.compose', 'content', 'Yêu cầu gợi ý nội dung email bằng AI', 'content');
    return HttpResponse.json(
      aiComposeResponseSchema.parse({ text: '<p>Khám phá các hoạt động cộng đồng OPC Hub.</p>' }),
    );
  }),
  http.get(`${API}/admin/settings/ai/calls`, ({ request }) => {
    const denied = mockAdminGuard(request, 'settings.general');
    if (denied) return denied;
    const q = parseQuery(request.url, aiCallsQuerySchema);
    return q.ok ? HttpResponse.json(mockAiCallsPage(q.data)) : q.res;
  }),
  http.post(`${API}/admin/settings/ai/calls/export`, async ({ request }) => {
    const denied = mockAdminGuard(request, 'settings.general');
    if (denied) return denied;
    const body = await parseBody(request, aiCallsFilterSchema);
    if (!body.ok) return body.res;
    const jobId = nextId('ai-calls-job'),
      actor = userIdOf(request);
    jobs.set(jobId, { actor, ...mockAiCallsCsv(body.data) });
    logSetting(actor, 'llm.calls.export', jobId, 'Xuất nhật ký gọi AI', 'settings');
    return HttpResponse.json({ jobId, status: 'queued' }, { status: 202 });
  }),
  http.get(`${API}/admin/exports/:id`, ({ request, params }) => {
    const id = param(params, 'id'),
      job = jobs.get(id);
    if (!job) return undefined;
    if (job.actor !== userIdOf(request)) return apiError(404, 'NOT_FOUND', 'Không có yêu cầu xuất');
    return HttpResponse.json({
      id,
      kind: 'ai_calls',
      status: 'done',
      rowCount: job.rows,
      url: `${new URL(request.url).origin}${API}/exports/ai-calls/${id}/nhat-ky-goi-ai.csv`,
      expiresInSec: 3600,
    });
  }),
  http.get(`${API}/exports/ai-calls/:id/:file`, ({ params }) => {
    const job = jobs.get(param(params, 'id'));
    return job
      ? new HttpResponse(job.csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8' } })
      : apiError(404, 'NOT_FOUND', 'Không có tệp');
  }),
];
