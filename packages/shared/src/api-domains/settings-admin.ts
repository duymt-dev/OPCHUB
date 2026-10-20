import { z } from 'zod';
import { categorySchema } from './settings';

/**
 * Admin "Cài đặt & Phân quyền" (G6a, D-66 → D-77) — bổ sung SRS §13 Settings (Q-G6a-1):
 * cài đặt chung, thứ tự + số dùng của lĩnh vực, kiểm tra SMTP, gửi thử email chào mừng,
 * nhật ký audit (TK quản trị §21 ở `admin-rbac`), SSO + chính sách bảo mật (D-33, D-44),
 * ngôn ngữ. Mọi thao tác ghi đều ghi audit_logs (luật 10).
 */

export const TIMEZONES = ['ict', 'sgt', 'mmt'] as const;
export type TimezoneKey = (typeof TIMEZONES)[number];

export const generalSettingsSchema = z.object({
  platformName: z.string().trim().min(1).max(120),
  domain: z.string().trim().min(1).max(120),
  contactEmail: z.email(),
  timezone: z.enum(TIMEZONES),
  /** null = logo mặc định */
  logoUrl: z.string().max(2000).nullable(),
  openRegistration: z.boolean(),
  otpVerification: z.boolean(),
  requireProfile: z.boolean(),
});
export type GeneralSettings = z.infer<typeof generalSettingsSchema>;
export const generalSettingsPatchSchema = generalSettingsSchema.partial();
export type GeneralSettingsPatch = z.infer<typeof generalSettingsPatchSchema>;

/** Lĩnh vực kèm số dự án / doanh nghiệp đang dùng (đang dùng thì chỉ ẩn, không xoá) */
export const adminCategorySchema = categorySchema.extend({
  projectCount: z.number().int().min(0),
  bizCount: z.number().int().min(0),
});
export type AdminCategory = z.infer<typeof adminCategorySchema>;
export const categoryOrderSchema = z.object({ ids: z.array(z.string().min(1)).min(1).max(200) });
export const categoryPatchSchema = z.object({ enabled: z.boolean() });

/** Kiểm tra kết nối SMTP với thông số đang nhập (chưa lưu); key bỏ trống = dùng key đã lưu */
export const smtpVerifySchema = z.object({
  host: z.string().trim().min(1),
  port: z.number().int().min(1).max(65535),
  encryption: z.enum(['tls', 'ssl', 'none']),
  username: z.string().trim().min(1),
  key: z.string().min(1).optional(),
});
export type SmtpVerify = z.infer<typeof smtpVerifySchema>;

export const AUDIT_TAGS = [
  'affiliate',
  'sso',
  'member',
  'permission',
  'project',
  'language',
  'moderation',
  'settings',
  'content',
] as const;
export type AuditTag = (typeof AUDIT_TAGS)[number];
export const auditLogRowSchema = z.object({
  id: z.string(),
  actorName: z.string(),
  actorAvatarUrl: z.string().nullable(),
  summary: z.string(),
  tag: z.enum(AUDIT_TAGS),
  at: z.string(),
});
export type AuditLogRow = z.infer<typeof auditLogRowSchema>;

export const SSO_IDS = ['google', 'facebook', 'linkedin', 'chatgpt', 'gemini', 'deepseek'] as const;
export type SsoId = (typeof SSO_IDS)[number];
export const PASSWORD_LENGTHS = [8, 10, 12] as const;
export const SESSION_DAYS = [7, 30, 90] as const;

export const securitySettingsSchema = z.object({
  providers: z.array(
    z.object({ id: z.enum(SSO_IDS), enabled: z.boolean(), userCount: z.number().int() }),
  ),
  minPasswordLength: z.literal(PASSWORD_LENGTHS),
  sessionDays: z.literal(SESSION_DAYS),
  /** Bắt buộc 2FA cho quản trị viên */
  requireAdmin2fa: z.boolean(),
  /** D-44: sai 5 lần → khoá 15 phút */
  lockoutEnabled: z.boolean(),
});
export type SecuritySettings = z.infer<typeof securitySettingsSchema>;
export const securityPatchSchema = securitySettingsSchema
  .omit({ providers: true })
  .partial()
  .extend({ provider: z.object({ id: z.enum(SSO_IDS), enabled: z.boolean() }).optional() });
export type SecurityPatch = z.infer<typeof securityPatchSchema>;

export const languageSettingsSchema = z.object({
  defaultLocale: z.string(),
  items: z.array(
    z.object({ code: z.string(), enabled: z.boolean(), progress: z.number().int().min(0) }),
  ),
});
export type LanguageSettings = z.infer<typeof languageSettingsSchema>;
export const languagePatchSchema = z.object({
  defaultLocale: z.string().min(2).optional(),
  toggle: z.object({ code: z.string().min(2), enabled: z.boolean() }).optional(),
});
export type LanguagePatch = z.infer<typeof languagePatchSchema>;

export const sendResultSchema = z.object({ ok: z.boolean(), message: z.string() });
