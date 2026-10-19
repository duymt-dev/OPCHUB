import { PASSWORD_RESET_INVALID_MESSAGE } from '@opchub/shared';
import {
  ADMIN_AUTH_MESSAGES as MSG,
  adminFirstPasswordSchema,
  adminTwoFactorEnableSchema,
  forgotPasswordSchema,
  isStrongAdminPassword,
  loginRequestSchema,
  resetPasswordSchema,
  totpVerifySchema,
} from '@opchub/shared/api';
import { mockLogin, mockResetPassword } from '@opchub/shared/mock-data';
import {
  getSecuritySettings,
  mockAdminEnable2fa,
  mockAdminFirstPassword,
  mockAdminLogin,
  mockAdminMeOf,
  mockAdminPassword,
  publicStats,
} from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { z } from 'zod';
import { parseBody, userIdOf } from './domain-util';
import { MOCK_TOTP_SECRET, verifyMockTotp } from './totp';
import { apiError, API } from './util';

/** Link đặt lại MSW đã dùng (cookie — sống qua tải trang như Redis GETDEL của server) */
const RESET_USED_COOKIE = 'opchub-mock-reset-used';
/** Token MSW ngắn hơn token thật (32 byte) — nới độ dài, giữ các trường còn lại của hợp đồng */
const mockResetSchema = resetPasswordSchema.extend({ token: z.string().min(1) });
/** D-62: link đặt lại của Admin thuộc Super Admin demo */
const RESET_EMAIL = 'admin@opchub.community';

const session = (id: string) => {
  const admin = mockAdminMeOf(id, getSecuritySettings().requireAdmin2fa);
  return admin
    ? HttpResponse.json({ accessToken: `mock.${id}`, admin })
    : apiError(401, 'UNAUTHORIZED', 'Phiên đã hết hạn');
};

/**
 * D-62 (TIP-V2-202/204): phiên Admin MSW theo 6 TK quản trị §21 — đăng nhập, mã TOTP,
 * đổi MK tạm (SEC-R01), thiết lập 2FA (SEC-R02), `/admin/auth/me`. TK thành viên đúng MK → WRONG_PORTAL.
 */
export const authHandlers = [
  // CR-15 / BUG-029: số liệu màn đăng nhập
  http.get(`${API}/public/stats`, () => HttpResponse.json(publicStats())),
  http.post(`${API}/admin/auth/login`, async ({ request }) => {
    const parsed = loginRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return apiError(400, 'VALIDATION_ERROR', 'Vui lòng nhập email và mật khẩu');
    }
    const { identifier, password } = parsed.data;
    const r = mockAdminLogin(identifier, password);
    if (!r.ok) {
      if (r.reason === 'locked') return apiError(403, 'FORBIDDEN', MSG.locked);
      if (mockLogin(identifier, password).ok) return apiError(403, 'WRONG_PORTAL', MSG.wrongPortal);
      return apiError(401, 'UNAUTHORIZED', MSG.badCredentials);
    }
    // D-27 bước 2: TK đã bật 2FA → chưa phát phiên, cần mã TOTP
    if (mockAdminMeOf(r.id)?.twoFactor) {
      return apiError(401, 'UNAUTHORIZED', 'Cần mã xác thực 2 lớp', [
        { path: 'mfaToken', message: `mfa.${r.id}` },
      ]);
    }
    return session(r.id);
  }),
  http.post(`${API}/admin/auth/totp/verify`, async ({ request }) => {
    const b = await parseBody(request, totpVerifySchema);
    if (!b.ok) return b.res;
    if (!(await verifyMockTotp(b.data.code))) return apiError(401, 'UNAUTHORIZED', MSG.codeInvalid);
    return session(b.data.mfaToken.replace(/^mfa\./, ''));
  }),
  http.post(`${API}/admin/auth/refresh`, () => apiError(401, 'UNAUTHORIZED', 'Phiên đã hết hạn')),
  http.post(`${API}/admin/auth/logout`, () => new HttpResponse(null, { status: 204 })),
  http.get(`${API}/admin/auth/me`, ({ request }) => {
    const me = mockAdminMeOf(userIdOf(request), getSecuritySettings().requireAdmin2fa);
    return me ? HttpResponse.json(me) : apiError(401, 'UNAUTHORIZED', 'Phiên đã hết hạn');
  }),
  http.post(`${API}/admin/auth/first-password`, async ({ request }) => {
    const b = await parseBody(request, adminFirstPasswordSchema);
    if (!b.ok) return b.res;
    const id = userIdOf(request);
    const field = (path: string, message: string) =>
      apiError(400, 'VALIDATION_ERROR', message, [{ path, message }]);
    const { newPassword, confirmPassword } = b.data;
    if (!isStrongAdminPassword(newPassword)) return field('newPassword', MSG.weakPassword);
    if (newPassword !== confirmPassword) return field('confirmPassword', MSG.mismatch);
    if (newPassword === mockAdminPassword(id)) return field('newPassword', MSG.sameAsTemp);
    mockAdminFirstPassword(id, newPassword);
    return session(id);
  }),
  http.post(`${API}/admin/auth/2fa/setup`, ({ request }) =>
    HttpResponse.json({
      otpauthUrl: `otpauth://totp/OPC%20Hub%3A${userIdOf(request)}?secret=${MOCK_TOTP_SECRET}&issuer=OPC%20Hub&period=30&digits=6`,
      secretMasked: `${MOCK_TOTP_SECRET.slice(0, 4)}••••${MOCK_TOTP_SECRET.slice(-4)}`,
    }),
  ),
  http.post(`${API}/admin/auth/2fa/enable`, async ({ request }) => {
    const b = await parseBody(request, adminTwoFactorEnableSchema);
    if (!b.ok) return b.res;
    if (!(await verifyMockTotp(b.data.code))) {
      return apiError(400, 'VALIDATION_ERROR', MSG.codeInvalid, [
        { path: 'code', message: MSG.codeInvalid },
      ]);
    }
    mockAdminEnable2fa(userIdOf(request));
    return session(userIdOf(request));
  }),
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
