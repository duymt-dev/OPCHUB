import { forgotPasswordSchema, loginRequestSchema } from '@opchub/shared/api';
import { mockLogin } from '@opchub/shared/mock-data';
import { http, HttpResponse } from 'msw/http';
import { apiError, API } from './util';

/** SRS §13 — POST /v1/auth/login, POST /v1/auth/logout, GET /v1/me */
export const authHandlers = [
  http.post(`${API}/auth/login`, async ({ request }) => {
    const parsed = loginRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return apiError(400, 'VALIDATION_ERROR', 'Vui lòng nhập email và mật khẩu');
    }
    const result = mockLogin(parsed.data.identifier, parsed.data.password);
    if (!result.ok) return apiError(401, 'UNAUTHORIZED', 'Email hoặc mật khẩu không đúng');
    return HttpResponse.json({ accessToken: `mock.${result.me.id}`, me: result.me });
  }),
  http.post(`${API}/auth/logout`, () => new HttpResponse(null, { status: 204 })),
  http.post(`${API}/auth/password/forgot`, async ({ request }) => {
    const parsed = forgotPasswordSchema.safeParse(await request.json());
    if (!parsed.success) return apiError(400, 'VALIDATION_ERROR', 'Vui lòng nhập email hợp lệ');
    return new HttpResponse(null, { status: 204 });
  }),
];
