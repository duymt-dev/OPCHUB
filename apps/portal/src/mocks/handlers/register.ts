import {
  forgotPasswordSchema,
  otpResendSchema,
  otpVerifySchema,
  registerBusinessSchema,
  registerPersonalSchema,
  TAX_CODE_RE,
} from '@opchub/shared/api';
import { MOCK_OTP, mockBizLookup, newMemberMe } from '@opchub/shared/mock-data';
import { http, HttpResponse } from 'msw/http';
import type { z } from 'zod';
import { apiError, API } from './util';

const OTP_TTL_SEC = 600;
/** email → họ tên đang chờ OTP */
const pending = new Map<string, string>();

function firstIssue(e: z.ZodError) {
  return e.issues[0]?.message ?? 'Dữ liệu không hợp lệ';
}

/** SRS §13 — đăng ký, OTP, tra MST, quên mật khẩu (QT-01, QT-02) */
export const registerHandlers = [
  http.post(`${API}/auth/register/personal`, async ({ request }) => {
    const parsed = registerPersonalSchema.safeParse(await request.json());
    if (!parsed.success) return apiError(400, 'VALIDATION_ERROR', firstIssue(parsed.error));
    pending.set(parsed.data.email, parsed.data.fullName);
    return HttpResponse.json(
      { email: parsed.data.email, expiresInSec: OTP_TTL_SEC },
      { status: 202 },
    );
  }),
  http.post(`${API}/auth/register/business`, async ({ request }) => {
    const parsed = registerBusinessSchema.safeParse(await request.json());
    if (!parsed.success) return apiError(400, 'VALIDATION_ERROR', firstIssue(parsed.error));
    pending.set(parsed.data.email, parsed.data.representative);
    return HttpResponse.json(
      { email: parsed.data.email, expiresInSec: OTP_TTL_SEC },
      { status: 202 },
    );
  }),
  http.post(`${API}/auth/otp/verify`, async ({ request }) => {
    const parsed = otpVerifySchema.safeParse(await request.json());
    if (!parsed.success) return apiError(400, 'VALIDATION_ERROR', firstIssue(parsed.error));
    if (parsed.data.code !== MOCK_OTP) return apiError(400, 'OTP_INVALID', 'Mã OTP không đúng');
    const me = newMemberMe(parsed.data.email, pending.get(parsed.data.email) ?? '');
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
];
