import {
  campaignCreateSchema,
  campaignEstimateQuerySchema,
  pageQuerySchema,
  welcomeTestSchema,
} from '@opchub/shared/api-domains';
import { paginate } from '@opchub/shared/mock-data';
import {
  createCampaign,
  deleteCampaign,
  estimateRecipients,
  listCampaigns,
  listMailLog,
  listMailTemplates,
  marketingSummary,
  resendMail,
  sendCampaign,
  testWelcomeMail,
} from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { param, parseBody, parseQuery, reply, userIdOf } from './domain-util';
import { API } from './util';

/**
 * Màn Admin Marketing (G6b, D-78/D-79) — endpoint ngoài SRS §13 (Q-G6b-1). Gửi mail chỉ tạo
 * job qua outbox → 202, không gửi thật (luật 8, 11). Mọi thao tác ghi audit_logs (luật 10).
 */
export const marketingHandlers = [
  http.get(`${API}/admin/marketing/summary`, () => HttpResponse.json(marketingSummary())),
  http.get(`${API}/admin/campaigns/templates`, () =>
    HttpResponse.json({ items: listMailTemplates() }),
  ),
  http.get(`${API}/admin/campaigns/estimate`, ({ request }) => {
    const q = parseQuery(request.url, campaignEstimateQuerySchema);
    if (!q.ok) return q.res;
    return HttpResponse.json({ recipients: estimateRecipients(q.data.audience, q.data.groupIds) });
  }),
  http.get(`${API}/admin/campaigns`, () => HttpResponse.json({ items: listCampaigns() })),
  http.post(`${API}/admin/campaigns`, async ({ request }) => {
    const body = await parseBody(request, campaignCreateSchema);
    if (!body.ok) return body.res;
    const c = createCampaign(userIdOf(request), body.data);
    return HttpResponse.json(c, { status: c.status === 'sending' ? 202 : 201 });
  }),
  http.post(`${API}/admin/campaigns/:id/send`, ({ request, params }) =>
    reply(sendCampaign(userIdOf(request), param(params, 'id')), 202),
  ),
  http.delete(`${API}/admin/campaigns/:id`, ({ request, params }) =>
    reply(deleteCampaign(userIdOf(request), param(params, 'id'))),
  ),
  http.get(`${API}/admin/mail/log`, ({ request }) => {
    const q = parseQuery(request.url, pageQuerySchema(20));
    if (!q.ok) return q.res;
    return HttpResponse.json(paginate(listMailLog(), q.data.page, q.data.size));
  }),
  http.post(`${API}/admin/mail/log/:id/resend`, ({ request, params }) =>
    reply(resendMail(userIdOf(request), param(params, 'id')), 202),
  ),
  http.post(`${API}/admin/mail/welcome/test`, async ({ request }) => {
    const body = await parseBody(request, welcomeTestSchema);
    if (!body.ok) return body.res;
    return HttpResponse.json(testWelcomeMail(userIdOf(request), body.data.to), { status: 202 });
  }),
];
