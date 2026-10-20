import {
  affiliateBankSchema,
  affiliateClickSchema,
  affiliateCodeParamsSchema,
  affiliateCodeQuerySchema,
  affiliatePageQuerySchema,
} from '@opchub/shared/api-domains';
import {
  checkMockAffiliate,
  clickMockAffiliate,
  mockAffiliateBank,
  mockAffiliatePayouts,
  mockAffiliateReferrals,
  myMockAffiliate,
} from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { param, parseBody, parseQuery, reply, userIdOf, validationError } from './domain-util';
import { apiError, API } from './util';

const authorized = (r: Request) => /^Bearer mock\./.test(r.headers.get('Authorization') ?? '');
const denied = () => apiError(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập');

export const affiliateHandlers = [
  http.get(`${API}/public/affiliate/codes/:code`, ({ params, request }) => {
    const p = affiliateCodeParamsSchema.safeParse({ code: param(params, 'code') });
    if (!p.success) return validationError(p.error);
    const q = parseQuery(request.url, affiliateCodeQuerySchema);
    return q.ok ? HttpResponse.json(checkMockAffiliate(p.data.code, q.data.email)) : q.res;
  }),
  http.post(`${API}/public/affiliate/click`, async ({ request }) => {
    const body = await parseBody(request, affiliateClickSchema);
    if (!body.ok) return body.res;
    clickMockAffiliate(body.data.code, request.headers.get('X-Forwarded-For') ?? 'local');
    return new HttpResponse(null, { status: 204 });
  }),
  http.get(`${API}/me/affiliate`, ({ request }) => {
    if (!authorized(request)) return denied();
    return HttpResponse.json(myMockAffiliate(userIdOf(request), new URL(request.url).origin));
  }),
  http.put(`${API}/me/affiliate/bank`, async ({ request }) => {
    if (!authorized(request)) return denied();
    const body = await parseBody(request, affiliateBankSchema);
    return body.ok ? reply(mockAffiliateBank(userIdOf(request), body.data)) : body.res;
  }),
  http.get(`${API}/me/affiliate/referrals`, ({ request }) => {
    if (!authorized(request)) return denied();
    const uid = userIdOf(request),
      q = parseQuery(request.url, affiliatePageQuerySchema);
    if (!q.ok) return q.res;
    if (myMockAffiliate(uid, '').state === 'locked')
      return apiError(409, 'CONFLICT', 'Đóng phí thành viên để nhận link giới thiệu');
    return HttpResponse.json(mockAffiliateReferrals(uid, q.data));
  }),
  http.get(`${API}/me/affiliate/payouts`, ({ request }) => {
    if (!authorized(request)) return denied();
    const uid = userIdOf(request),
      q = parseQuery(request.url, affiliatePageQuerySchema);
    if (!q.ok) return q.res;
    if (myMockAffiliate(uid, '').state === 'locked')
      return apiError(409, 'CONFLICT', 'Đóng phí thành viên để nhận link giới thiệu');
    return HttpResponse.json(mockAffiliatePayouts(uid, q.data));
  }),
];
