import {
  keywordSchema,
  pageQuerySchema,
  reportActionSchema,
  reportQuerySchema,
  reportSchema,
} from '@opchub/shared/api-domains';
import { paginate } from '@opchub/shared/mock-data';
import {
  actOnReport,
  addKeyword,
  drainMockKeywordHits,
  getReport,
  listKeywords,
  listReports,
  removeKeyword,
} from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { mockAdminGuard } from './admin-guard';
import { adminWriteGuard, parseAdminBody } from './admin-json';
import { param, parseBody, parseQuery, reply, userIdOf } from './domain-util';
import { API } from './util';

const reportPageSchema = pageQuerySchema(10).extend(reportQuerySchema.shape);

/** Native canonical permission keys; no headerless-admin fallback for moderation. */
export const moderationHandlers = [
  http.get(`${API}/admin/reports`, ({ request }) => {
    const denied = mockAdminGuard(request, 'groups.view');
    if (denied) return denied;
    const query = parseQuery(request.url, reportPageSchema);
    if (!query.ok) return query.res;
    drainMockKeywordHits();
    return HttpResponse.json(
      paginate(listReports(query.data.source, query.data.status), query.data.page, query.data.size),
    );
  }),
  http.get(`${API}/admin/reports/:id/action`, ({ request, params }) => {
    const denied = mockAdminGuard(request, 'groups.view');
    return denied ?? reply(getReport(param(params, 'id')));
  }),
  http.post(`${API}/admin/reports/:id/action`, async ({ request, params }) => {
    const denied = await adminWriteGuard(request, 'groups.moderate');
    if (denied) return denied;
    const body = await parseAdminBody(request, reportActionSchema);
    if (!body.ok) return body.res;
    const result = actOnReport(
      param(params, 'id'),
      body.data.action,
      userIdOf(request),
      body.data.note ?? null,
    );
    return result.ok ? HttpResponse.json(reportSchema.parse(result.data)) : reply(result);
  }),
  http.get(`${API}/admin/moderation/keywords`, ({ request }) => {
    const denied = mockAdminGuard(request, 'groups.view');
    return denied ?? HttpResponse.json({ items: listKeywords() });
  }),
  http.post(`${API}/admin/moderation/keywords`, async ({ request }) => {
    const denied = mockAdminGuard(request, 'groups.moderate');
    if (denied) return denied;
    const body = await parseBody(request, keywordSchema);
    return body.ok ? reply(addKeyword(userIdOf(request), body.data.word), 201) : body.res;
  }),
  http.delete(`${API}/admin/moderation/keywords/:word`, ({ request, params }) => {
    const denied = mockAdminGuard(request, 'groups.moderate');
    return denied ?? reply(removeKeyword(userIdOf(request), param(params, 'word')));
  }),
];
