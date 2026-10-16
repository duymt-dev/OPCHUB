import { ssoCompleteSchema } from '@opchub/shared/api';
import { newMemberMe } from '@opchub/shared/mock-data';
import { http, HttpResponse } from 'msw/http';
import { apiError, API } from './util';

/** Email giả mà provider SSO trả về khi dùng MSW — luôn là thành viên mới (D-45) */
const SSO_EMAIL = 'sso.member@gmail.com';
const SSO_NAME = 'Thành viên SSO';
const REG_CLOSED_COOKIE = 'opchub-mock-reg-closed';

/** SRS §13 — GET /auth/sso/:provider/callback, POST /auth/sso/complete, GET /public/settings */
export const ssoHandlers = [
  // Cookie chỉ dùng cho mock/test: giả lập admin tắt "Cho phép tự đăng ký" (A-11)
  http.get(`${API}/public/settings`, ({ cookies }) =>
    HttpResponse.json({ registrationOpen: cookies[REG_CLOSED_COOKIE] !== '1' }),
  ),
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
    const me = newMemberMe(SSO_EMAIL, SSO_NAME);
    return HttpResponse.json({ accessToken: `mock.${me.id}`, me });
  }),
];
