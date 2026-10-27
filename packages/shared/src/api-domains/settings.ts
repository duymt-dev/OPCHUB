import { z } from 'zod';

/** SRS §13 Settings — categories, roles/permissions, mail/welcome, smtp, notifications */

/** D-89 (v4): Dự án · Doanh nghiệp · Nhóm ngành mạng lưới (`net`) */
export const CATEGORY_SCOPES = ['project', 'biz', 'net'] as const;
export type CategoryScope = (typeof CATEGORY_SCOPES)[number];

export const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  scope: z.array(z.enum(CATEGORY_SCOPES)),
  enabled: z.boolean(),
});
export type Category = z.infer<typeof categorySchema>;

export const categoryUpsertSchema = z.object({
  name: z.string().trim().min(1).max(60),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  scope: z.array(z.enum(CATEGORY_SCOPES)).min(1),
  enabled: z.boolean().default(true),
});

export const welcomeMailSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  intro: z.string().trim().max(2000),
  loginUrl: z.url(),
  guideUrl: z.url(),
  attachments: z.array(z.object({ title: z.string(), url: z.url() })),
  rules: z.array(z.string()),
  /**
   * D-91 (5): khối "Tài khoản truy cập" như prototype v4 (URL đăng nhập, Tên đăng nhập, dòng mật
   * khẩu) — dòng mật khẩu chỉ nhắc "mật khẩu bạn đã đặt", **không bao giờ** chứa mật khẩu (D-47).
   * Mẫu cũ chưa có cờ → bật như prototype.
   */
  showAccess: z.boolean().default(true),
  showRules: z.boolean(),
  showGuide: z.boolean(),
});
export type WelcomeMail = z.infer<typeof welcomeMailSchema>;

/** Không bao giờ trả SMTP key ra ngoài — chỉ cờ `hasKey` */
export const smtpSettingsSchema = z.object({
  host: z.string(),
  port: z.number().int(),
  encryption: z.enum(['tls', 'ssl', 'none']),
  username: z.string(),
  hasKey: z.boolean(),
  fromName: z.string(),
  fromEmail: z.email(),
  replyTo: z.email(),
  dailyLimit: z.number().int(),
  enabled: z.boolean(),
});
export type SmtpSettings = z.infer<typeof smtpSettingsSchema>;

export const smtpUpdateSchema = smtpSettingsSchema
  .omit({ hasKey: true })
  .extend({ key: z.string().min(1).optional() });

export const smtpTestSchema = z.object({ to: z.email() });
export const smtpTestResultSchema = z.object({ ok: z.boolean(), message: z.string() });

export const NOTIFICATION_TYPES = [
  'mention',
  'event',
  'group',
  'verify',
  'membership',
  /** IV-R01: Admin phản hồi quan tâm đầu tư (TIP-V2-107) */
  'invest',
  /** §20: hoa hồng ghi nhận / huỷ / chi trả, đổi tỷ lệ (TIP-V2-401) */
  'affiliate',
  /** V4-611 (D-88): Admin nhắc hoàn tất hướng dẫn bắt đầu */
  'system',
] as const;
export const notificationSchema = z.object({
  id: z.string(),
  type: z.enum(NOTIFICATION_TYPES),
  title: z.string(),
  body: z.string(),
  link: z.string(),
  read: z.boolean(),
  createdAt: z.string(),
});
export type Notification = z.infer<typeof notificationSchema>;
