import { loginRequestSchema } from '@opchub/shared/api';
import { mockLogin } from '@opchub/shared/mock-data';
import { mockAffiliateDemoLogin } from '@opchub/shared/mock-domains';
import { http } from 'msw/http';
import { apiError, API } from './util';
import { clearMockSession, mockSessionResponse } from './mock-auth-session';

/** SRS §13 — POST /v1/auth/login, POST /v1/auth/logout, GET /v1/me */
export const authHandlers = [
  http.post(`${API}/auth/login`, async ({ request }) => {
    const parsed = loginRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return apiError(400, 'VALIDATION_ERROR', 'Vui lòng nhập email và mật khẩu');
    }
    const result =
      mockAffiliateDemoLogin(parsed.data.identifier, parsed.data.password) ??
      mockLogin(parsed.data.identifier, parsed.data.password);
    // D-62 (TIP-V2-202): TK quản trị đăng nhập ở cổng Admin
    if (!result.ok && result.wrongPortal) {
      return apiError(403, 'WRONG_PORTAL', 'Tài khoản này đăng nhập ở cổng khác');
    }
    if (!result.ok) return apiError(401, 'UNAUTHORIZED', 'Email hoặc mật khẩu không đúng');
    return mockSessionResponse(result.me);
  }),
  http.post(`${API}/auth/logout`, clearMockSession),
];
