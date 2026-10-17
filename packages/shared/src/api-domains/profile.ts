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
});
export type Profile = z.infer<typeof profileSchema>;

const EMAIL_RE = /.+@.+\..+/;

/** PATCH /me — chỉ gửi trường đổi; MST / tên DN bị khoá khi đã xác minh (D-40) */
export const updateProfileSchema = z
  .object({
    fullName: z.string().trim().min(1, PROFILE_MESSAGES.nameRequired).max(100),
    email: z.string().trim().regex(EMAIL_RE, PROFILE_MESSAGES.emailInvalid),
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

/** Q-G3b-6, Q-G5a-2: ảnh bìa dự án / sự kiện, avatar thành viên đội */
export const UPLOAD_KINDS = ['avatar', 'project-cover', 'team-avatar', 'event-cover'] as const;
export type UploadKind = (typeof UPLOAD_KINDS)[number];
export const presignRequestSchema = z.object({
  kind: z.enum(UPLOAD_KINDS),
  contentType: z.enum(['image/png', 'image/jpeg', 'image/webp']),
  /** byte; ≤ 5 MB như UploadImage */
  size: z
    .number()
    .int()
    .min(1)
    .max(5 * 1024 * 1024),
});
export type PresignRequest = z.infer<typeof presignRequestSchema>;
export const presignResultSchema = z.object({ uploadUrl: z.string(), publicUrl: z.url() });
export type PresignResult = z.infer<typeof presignResultSchema>;
