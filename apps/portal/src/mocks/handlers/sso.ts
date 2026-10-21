import { ssoCompleteSchema } from '@opchub/shared/api';
import { SSO_IDS } from '@opchub/shared/api-domains';
import { newMemberMe } from '@opchub/shared/mock-data';
import { attachMockAffiliate, mockReferralError, publicStats } from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { apiError, API } from './util';
import { mockSessionResponse } from './mock-auth-session';

/** Email giả mà provider SSO trả về khi dùng MSW — luôn là thành viên mới (D-45) */
const SSO_EMAIL = 'sso.member@gmail.com';
const SSO_NAME = 'Thành viên SSO';
const REG_CLOSED_COOKIE = 'opchub-mock-reg-closed';

/** SRS §13 — GET /auth/sso/:provider/callback, POST /auth/sso/complete, GET /public/settings */
export const ssoHandlers = [
  // Cookie chỉ dùng cho mock/test: giả lập admin tắt "Cho phép tự đăng ký" (A-11)
  http.get(`${API}/public/settings`, ({ cookies }) =>
    HttpResponse.json({
      registrationOpen: cookies[REG_CLOSED_COOKIE] !== '1',
      // D-64: mock hiện đủ 6 nút như prototype (server thật lọc theo Admin + provider)
      ssoProviders: [...SSO_IDS],
    }),
  ),
  http.get(`${API}/public/stats`, () => HttpResponse.json(publicStats())),
  http.get(`${API}/auth/sso/:provider/callback`, ({ params }) =>
    HttpResponse.json({
      status: 'new',
      ssoToken: `sso.${String(params['provider'])}`,
      email: SSO_EMAIL,
      fullName: SSO_NAME,
    }),
  ),
  http.post(`${API}/auth/sso/complete`, async ({ request }) => {
    const parsed = ssoCompleteSchema.safeParse(await request.json());
    if (!parsed.success)
      return apiError(400, 'VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Lỗi dữ liệu');
    const ref = mockReferralError(parsed.data.referralCode, SSO_EMAIL);
    if (ref) return apiError(400, 'VALIDATION_ERROR', ref.message, ref.fields);
    const me = { ...newMemberMe(SSO_EMAIL, SSO_NAME), accountType: parsed.data.accountType };
    attachMockAffiliate(me, parsed.data.referralCode);
    return mockSessionResponse(me);
  }),
];
