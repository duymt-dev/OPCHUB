import { z } from 'zod';
import { ALL_PERMISSIONS, type PermissionKey } from '../permissions';

/** SRS §13 Settings — categories, roles/permissions, mail/welcome, smtp, notifications */

export const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  scope: z.array(z.enum(['project', 'biz'])),
  enabled: z.boolean(),
});
export type Category = z.infer<typeof categorySchema>;

export const categoryUpsertSchema = z.object({
  name: z.string().trim().min(1).max(60),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  scope: z.array(z.enum(['project', 'biz'])).min(1),
  enabled: z.boolean().default(true),
});

const permissionKeySchema = z.enum(ALL_PERMISSIONS as [PermissionKey, ...PermissionKey[]]);
export const rolePermissionsSchema = z.object({
  admin: z.array(permissionKeySchema),
  moderator: z.array(permissionKeySchema),
  member: z.array(permissionKeySchema),
});
export type RolePermissions = z.infer<typeof rolePermissionsSchema>;

export const welcomeMailSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  intro: z.string().trim().max(2000),
  loginUrl: z.url(),
  guideUrl: z.url(),
  attachments: z.array(z.object({ title: z.string(), url: z.url() })),
  rules: z.array(z.string()),
  showPassword: z.boolean(),
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

export const NOTIFICATION_TYPES = ['mention', 'event', 'group', 'verify', 'membership'] as const;
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
