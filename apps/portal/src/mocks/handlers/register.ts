import {
  forgotPasswordSchema,
  otpResendSchema,
  otpVerifySchema,
  registerBusinessSchema,
  registerPersonalSchema,
  resetPasswordSchema,
  TAX_CODE_RE,
} from '@opchub/shared/api';
import { PASSWORD_RESET_INVALID_MESSAGE } from '@opchub/shared';
import { demoAccounts } from '@opchub/shared/fixtures';
import { MOCK_OTP, mockBizLookup, mockResetPassword, newMemberMe } from '@opchub/shared/mock-data';
import { joinOnRegister } from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { z } from 'zod';
import { apiError, API } from './util';

const OTP_TTL_SEC = 600;

/** Link đặt lại MSW đã dùng (cookie — sống qua tải trang như Redis GETDEL của server) */
const RESET_USED_COOKIE = 'opchub-mock-reset-used';
/** Token MSW ngắn hơn token thật (32 byte) — nới độ dài, giữ các trường còn lại của hợp đồng */
const mockResetSchema = resetPasswordSchema.extend({ token: z.string().min(1) });
/** Link đặt lại MSW thuộc TK thành viên demo (bản server: TK nào xin link thì nhận link đó) */
const RESET_EMAIL = demoAccounts.find((a) => a.role === 'user')?.email ?? '';
/** email → họ tên + nhóm chọn, đang chờ OTP */
const pending = new Map<string, { name: string; groupIds: string[] }>();

function firstIssue(e: z.ZodError) {
  return e.issues[0]?.message ?? 'Dữ liệu không hợp lệ';
}

/** 400 như filter server: thông điệp lỗi đầu + `fields` cho lỗi tại ô (BUG-022) */
const invalid = (e: z.ZodError) =>
  apiError(
    400,
    'VALIDATION_ERROR',
    firstIssue(e),
    e.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
  );

/** Như `register.service` REGISTER_MESSAGES.emailTaken */
const EMAIL_TAKEN = 'Email đã được sử dụng cho tài khoản khác';
/** Email TK demo đã tồn tại (cùng seed với server — D-63) */
const TAKEN_EMAILS = new Set(demoAccounts.map((a) => a.email.toLowerCase()));

/** BUG-009 UAT-02: email đã có TK → 409 `fields[{path:'email'}]` như server */
const emailTaken = (email: string) =>
  TAKEN_EMAILS.has(email.trim().toLowerCase())
    ? apiError(409, 'CONFLICT', EMAIL_TAKEN, [{ path: 'email', message: EMAIL_TAKEN }])
    : null;

/** SRS §13 — đăng ký, OTP, tra MST, quên mật khẩu (QT-01, QT-02) */
export const registerHandlers = [
  http.post(`${API}/auth/register/personal`, async ({ request }) => {
    const parsed = registerPersonalSchema.safeParse(await request.json());
    if (!parsed.success) return invalid(parsed.error);
    const taken = emailTaken(parsed.data.email);
    if (taken) return taken;
    pending.set(parsed.data.email, { name: parsed.data.fullName, groupIds: parsed.data.groupIds });
    return HttpResponse.json(
      { email: parsed.data.email, expiresInSec: OTP_TTL_SEC },
      { status: 202 },
    );
  }),
  http.post(`${API}/auth/register/business`, async ({ request }) => {
    const parsed = registerBusinessSchema.safeParse(await request.json());
    if (!parsed.success) return invalid(parsed.error);
    const taken = emailTaken(parsed.data.email);
    if (taken) return taken;
    pending.set(parsed.data.email, {
      name: parsed.data.representative,
      groupIds: parsed.data.groupIds,
    });
    return HttpResponse.json(
      { email: parsed.data.email, expiresInSec: OTP_TTL_SEC },
      { status: 202 },
    );
  }),
  http.post(`${API}/auth/otp/verify`, async ({ request }) => {
    const parsed = otpVerifySchema.safeParse(await request.json());
    if (!parsed.success) return apiError(400, 'VALIDATION_ERROR', firstIssue(parsed.error));
    if (parsed.data.code !== MOCK_OTP) return apiError(400, 'OTP_INVALID', 'Mã OTP không đúng');
    const p = pending.get(parsed.data.email);
    const me = newMemberMe(parsed.data.email, p?.name ?? '');
    // NA-18: nhóm mở vào ngay, nhóm cần duyệt chờ chủ nhóm (như server)
    joinOnRegister(me.id, me.fullName, p?.groupIds ?? []);
    pending.delete(parsed.data.email);
    return HttpResponse.json({ accessToken: `mock.${me.id}`, me });
  }),
  http.post(`${API}/auth/otp/resend`, async ({ request }) => {
    const parsed = otpResendSchema.safeParse(await request.json());
    if (!parsed.success) return apiError(400, 'VALIDATION_ERROR', firstIssue(parsed.error));
    return HttpResponse.json(
      { email: parsed.data.email, expiresInSec: OTP_TTL_SEC },
      { status: 202 },
    );
  }),
  http.get(`${API}/biz/lookup`, ({ request }) => {
    const tax = new URL(request.url).searchParams.get('tax') ?? '';
    if (!TAX_CODE_RE.test(tax))
      return apiError(400, 'VALIDATION_ERROR', 'Mã số thuế gồm 10 hoặc 13 chữ số');
    return HttpResponse.json(mockBizLookup(tax));
  }),
  http.post(`${API}/auth/password/forgot`, async ({ request }) => {
    const parsed = forgotPasswordSchema.safeParse(await request.json());
    if (!parsed.success) return apiError(400, 'VALIDATION_ERROR', firstIssue(parsed.error));
    // Luôn 204 dù email có tồn tại hay không — không lộ tài khoản
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
