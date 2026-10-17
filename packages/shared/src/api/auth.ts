import { z } from 'zod';
import { meSchema } from './me';

/** Hợp đồng API đăng ký / OTP / quên mật khẩu — SRS §13 (QT-01, QT-02) */

const email = z.email('Vui lòng nhập email hợp lệ để nhận mã OTP');
/** MST 10 số hoặc 13 số dạng 0101234567-001 */
export const TAX_CODE_RE = /^\d{10}(-\d{3})?$/;
export const taxCodeSchema = z
  .string()
  .trim()
  .regex(TAX_CODE_RE, 'Mã số thuế gồm 10 hoặc 13 chữ số');

const phone = z.object({ country: z.string().length(2), number: z.string().trim() });

export const registerPersonalSchema = z.object({
  fullName: z.string().trim(),
  phone,
  email,
  password: z.string(),
  persona: z.string().min(1, 'Vui lòng chọn vai trò khi tham gia'),
  groupIds: z.array(z.string()).min(1, 'Vui lòng chọn ít nhất 1 nhóm'),
});
export type RegisterPersonalRequest = z.infer<typeof registerPersonalSchema>;

export const registerBusinessSchema = z.object({
  taxCode: taxCodeSchema,
  companyName: z.string().trim().min(1, 'Vui lòng nhập tên doanh nghiệp'),
  mainIndustry: z.string().trim().min(1, 'Vui lòng nhập ngành nghề kinh doanh'),
  otherIndustries: z.array(z.string()),
  size: z.string(),
  country: z.string(),
  representative: z.string().trim(),
  position: z.string().trim(),
  phone,
  email,
  password: z.string(),
  groupIds: z.array(z.string()).min(1, 'Vui lòng chọn ít nhất 1 nhóm'),
});
export type RegisterBusinessRequest = z.infer<typeof registerBusinessSchema>;

/** 202: đã gửi OTP tới email */
export const otpSentSchema = z.object({ email: z.string(), expiresInSec: z.number().int() });
export type OtpSent = z.infer<typeof otpSentSchema>;

export const otpVerifySchema = z.object({
  email: z.string(),
  code: z.string().regex(/^\d{6}$/, 'Vui lòng nhập đủ 6 chữ số'),
});
export type OtpVerifyRequest = z.infer<typeof otpVerifySchema>;

export const otpResendSchema = z.object({ email: z.string() });

export const bizLookupSchema = z.object({
  taxCode: z.string(),
  companyName: z.string(),
  representative: z.string(),
  mainIndustry: z.string(),
  otherIndustries: z.array(z.string()),
});
export type BizLookup = z.infer<typeof bizLookupSchema>;

export const forgotPasswordSchema = z.object({ email: z.email('Vui lòng nhập email hợp lệ') });
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordSchema>;

/**
 * D-45: callback SSO. Email đã có TK → đăng nhập luôn; chưa có → form bổ sung (bỏ OTP email).
 */
export const ssoCallbackSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('existing'), accessToken: z.string(), me: meSchema }),
  z.object({
    status: z.literal('new'),
    ssoToken: z.string(),
    email: z.string(),
    fullName: z.string(),
  }),
]);
export type SsoCallback = z.infer<typeof ssoCallbackSchema>;

export const ssoCompleteSchema = z.object({
  ssoToken: z.string().min(1),
  accountType: z.enum(['personal', 'business']),
  phone,
  groupIds: z.array(z.string()).min(1, 'Vui lòng chọn ít nhất 1 nhóm'),
});
export type SsoCompleteRequest = z.infer<typeof ssoCompleteSchema>;

/** GET /v1/public/settings — cấu hình công khai cho màn Auth */
export const publicSettingsSchema = z.object({ registrationOpen: z.boolean() });
export type PublicSettings = z.infer<typeof publicSettingsSchema>;

/** GET /v1/public/stats (D-38) — số liệu màn đăng nhập, cache 60 giây */
export const publicStatsSchema = z.object({
  members: z.number().int().min(0),
  communities: z.number().int().min(0),
});
export type PublicStats = z.infer<typeof publicStatsSchema>;

/** POST /v1/auth/password/reset — token từ link trong mail (TTL 15 phút, dùng một lần) */
export const resetPasswordSchema = z.object({
  token: z.string().min(20).max(200),
  newPassword: z.string().min(1, 'Vui lòng nhập mật khẩu mới'),
});
export type ResetPasswordRequest = z.infer<typeof resetPasswordSchema>;

/**
 * Bước 2 đăng nhập khi TK đã bật TOTP (D-27, Q-B12-1): login trả 401 kèm
 * `fields[{path:'mfaToken'}]`, client gửi lại `mfaToken` + mã 6 số.
 */
export const totpVerifySchema = z.object({
  mfaToken: z.string().min(20).max(200),
  code: z.string().regex(/^\d{6}$/, 'Vui lòng nhập đủ 6 chữ số'),
});
export type TotpVerifyRequest = z.infer<typeof totpVerifySchema>;
