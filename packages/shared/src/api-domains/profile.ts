import { z } from 'zod';
import { meSchema } from '../api';

/**
 * SRS §13 Users — `GET /me`, `PATCH /me` (hồ sơ đầy đủ cho màn Hồ sơ, UP-06) và phần bổ sung:
 * `POST /auth/password/change`, `POST /auth/sessions/revoke-others`, `POST|DELETE /me/sso/:provider`,
 * `POST /uploads/presign` (avatar qua presigned PUT, security.md). Xem Q-G3c-1.
 */

export const PROFILE_VERIFICATION = ['verified', 'pending'] as const;

/** Lỗi hiển thị nguyên văn (toast) — trùng chữ prototype */
export const PROFILE_MESSAGES = {
  nameRequired: 'Họ và tên không được để trống',
  emailInvalid: 'Email không hợp lệ',
  bizLocked: 'Mã số thuế và tên doanh nghiệp chỉ thay đổi được qua quản trị viên',
  currentRequired: 'Nhập mật khẩu hiện tại',
  weakPassword: 'Mật khẩu mới chưa đủ mạnh',
  confirmMismatch: 'Xác nhận mật khẩu không khớp',
  currentWrong: 'Mật khẩu hiện tại không đúng',
  /** BUG-030: email là tên đăng nhập (QT-01) — chỉ đổi qua `POST /me/email/otp` + `/verify` */
  emailNeedsOtp: 'Đổi email cần xác nhận OTP',
  emailSame: 'Email mới trùng với email hiện tại',
  emailTaken: 'Email đã được sử dụng cho tài khoản khác',
  /** BUG-030, NA-17: TK chưa có mật khẩu không được huỷ liên kết SSO cuối cùng */
  lastSso: 'Đặt mật khẩu trước khi huỷ liên kết cuối cùng',
} as const;

export const profilePhoneSchema = z.object({
  /** Mã quốc gia 2 ký tự thường (vn, th…) */
  country: z.string().length(2),
  number: z.string().trim().max(20),
});

export const businessProfileSchema = z.object({
  taxCode: z.string(),
  companyName: z.string(),
  field: z.string(),
  size: z.string(),
  position: z.string(),
  website: z.string(),
  /** D-40: tự gắn "Đã xác minh" khi tra MST khớp; không khớp → chờ admin duyệt tay */
  verification: z.enum(PROFILE_VERIFICATION),
});
export type BusinessProfile = z.infer<typeof businessProfileSchema>;

export const profileStatsSchema = z.object({
  groups: z.number().int().min(0),
  events: z.number().int().min(0),
  projects: z.number().int().min(0),
});
export type ProfileStats = z.infer<typeof profileStatsSchema>;

export const profileSchema = meSchema.extend({
  phone: profilePhoneSchema,
  persona: z.string(),
  /** Mã quốc gia (vn, th…) */
  country: z.string(),
  city: z.string(),
  bio: z.string(),
  joinedAt: z.string(),
  business: businessProfileSchema.nullable(),
  stats: profileStatsSchema,
  /** Id nhà cung cấp SSO đã liên kết (google, linkedin…) */
  linkedSso: z.array(z.string()),
  /** BUG-030: false = TK chỉ đăng nhập qua SSO → khoá nút huỷ liên kết cuối cùng */
  hasPassword: z.boolean(),
});
export type Profile = z.infer<typeof profileSchema>;

const EMAIL_RE = /.+@.+\..+/;

/** PATCH /me — chỉ gửi trường đổi; MST / tên DN bị khoá khi đã xác minh (D-40) */
export const updateProfileSchema = z
  .object({
    fullName: z.string().trim().min(1, PROFILE_MESSAGES.nameRequired).max(100),
    /** BUG-030: gửi `email` → 400 (đổi email đi luồng OTP riêng) */
    email: z.never({ error: PROFILE_MESSAGES.emailNeedsOtp }),
    phone: profilePhoneSchema,
    persona: z.string().trim().max(100),
    country: z.string().trim().max(2),
    city: z.string().trim().max(100),
    bio: z.string().trim().max(1000),
    avatarUrl: z.url().nullable(),
    business: z
      .object({
        taxCode: z.string().trim().max(20),
        companyName: z.string().trim().max(200),
        field: z.string().trim().max(100),
        size: z.string().trim().max(50),
        position: z.string().trim().max(100),
        website: z.string().trim().max(200),
      })
      .partial(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Không có trường nào để cập nhật');
export type UpdateProfileRequest = z.infer<typeof updateProfileSchema>;

const newEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .regex(EMAIL_RE, PROFILE_MESSAGES.emailInvalid);

/** `POST /me/email/otp` (BUG-030, QT-01): OTP gửi tới email MỚI → trả `otpSentSchema` */
export const emailChangeRequestSchema = z.object({ newEmail: newEmailSchema });
export type EmailChangeRequest = z.infer<typeof emailChangeRequestSchema>;

/** `POST /me/email/verify`: đúng mã → đổi email, thu hồi phiên khác → trả `profileSchema` */
export const emailChangeVerifySchema = z.object({
  newEmail: newEmailSchema,
  code: z.string().regex(/^\d{6}$/, 'Vui lòng nhập đủ 6 chữ số'),
});
export type EmailChangeVerifyRequest = z.infer<typeof emailChangeVerifySchema>;

/** Độ mạnh 0–4: đủ 8 ký tự, chữ hoa, số, ký tự đặc biệt (giống form đăng ký) */
export function passwordScore(pwd: string): number {
  return [/.{8,}/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pwd)).length;
}
/** Mức tối thiểu để đổi mật khẩu (prototype: score ≥ 3) */
export const MIN_PASSWORD_SCORE = 3;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, PROFILE_MESSAGES.currentRequired),
  newPassword: z
    .string()
    .refine((v) => passwordScore(v) >= MIN_PASSWORD_SCORE, PROFILE_MESSAGES.weakPassword),
});
export type ChangePasswordRequest = z.infer<typeof changePasswordSchema>;

export const revokeSessionsResultSchema = z.object({ revoked: z.number().int().min(0) });
export type RevokeSessionsResult = z.infer<typeof revokeSessionsResultSchema>;

export const ssoLinkResultSchema = z.object({
  provider: z.string(),
  linked: z.boolean(),
});
export type SsoLinkResult = z.infer<typeof ssoLinkResultSchema>;

/** `POST /uploads/presign`: xem `./uploads` (TIP-V2-111 tách hằng + schema theo kind) */
