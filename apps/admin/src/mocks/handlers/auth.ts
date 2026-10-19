import { PASSWORD_RESET_INVALID_MESSAGE } from '@opchub/shared';
import { forgotPasswordSchema, loginRequestSchema, resetPasswordSchema } from '@opchub/shared/api';
import { demoAccounts } from '@opchub/shared/fixtures';
import { mockAdminMe, mockLogin, mockResetPassword } from '@opchub/shared/mock-data';
import { http, HttpResponse } from 'msw/http';
import { z } from 'zod';
import { apiError, API } from './util';

/** Link đặt lại MSW đã dùng (cookie — sống qua tải trang như Redis GETDEL của server) */
const RESET_USED_COOKIE = 'opchub-mock-reset-used';
/** Token MSW ngắn hơn token thật (32 byte) — nới độ dài, giữ các trường còn lại của hợp đồng */
const mockResetSchema = resetPasswordSchema.extend({ token: z.string().min(1) });
/** D-62: link đặt lại của Admin thuộc TK quản trị demo */
const RESET_EMAIL = demoAccounts.find((a) => a.role === 'admin')?.email ?? '';

/** D-62 (TIP-V2-202): POST /v1/admin/auth/login|logout — TK thành viên đúng mật khẩu → WRONG_PORTAL */
export const authHandlers = [
  http.post(`${API}/admin/auth/login`, async ({ request }) => {
    const parsed = loginRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return apiError(400, 'VALIDATION_ERROR', 'Vui lòng nhập email và mật khẩu');
    }
    const result = mockLogin(parsed.data.identifier, parsed.data.password);
    if (!result.ok) return apiError(401, 'UNAUTHORIZED', 'Email hoặc mật khẩu không đúng');
    if (result.me.systemRole === 'member') {
      return apiError(403, 'WRONG_PORTAL', 'Tài khoản này đăng nhập ở cổng khác');
    }
    return HttpResponse.json({
      accessToken: `mock.${result.me.id}`,
      me: result.me,
      admin: mockAdminMe(result.me),
    });
  }),
  http.post(`${API}/admin/auth/logout`, () => new HttpResponse(null, { status: 204 })),
  http.post(`${API}/auth/password/forgot`, async ({ request }) => {
    const parsed = forgotPasswordSchema.safeParse(await request.json());
    if (!parsed.success) return apiError(400, 'VALIDATION_ERROR', 'Vui lòng nhập email hợp lệ');
    return new HttpResponse(null, { status: 204 });
  }),
  /**
   * QT-02 (MSW): chỉ `msw-reset-token` hợp lệ, dùng một lần (cookie như link đã dùng). Mật khẩu
   * mới gắn cho TK demo của app — đăng nhập lại bằng mật khẩu mới được (giống server).
   */
  http.post(`${API}/auth/password/reset`, async ({ request, cookies }) => {
    const parsed = mockResetSchema.safeParse(await request.json());
    if (!parsed.success) return apiError(400, 'VALIDATION_ERROR', PASSWORD_RESET_INVALID_MESSAGE);
    const r = mockResetPassword(parsed.data, cookies[RESET_USED_COOKIE] === '1', RESET_EMAIL);
    if (r.ok) {
      return new HttpResponse(null, {
        status: 204,
        headers: { 'Set-Cookie': `${RESET_USED_COOKIE}=1; Path=/` },
      });
    }
    return HttpResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: r.message,
          requestId: crypto.randomUUID(),
          ...(r.field ? { fields: [{ path: r.field, message: r.message }] } : {}),
        },
      },
      { status: 400 },
    );
  }),
];
