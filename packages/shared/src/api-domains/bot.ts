import { z } from 'zod';

/** SRS §13 Bot — /admin/personas, /admin/scripts, /admin/bot/settings, /admin/bot/log */

export const personaSchema = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string(),
  province: z.string(),
  tone: z.string(),
  groupIds: z.array(z.string()),
  enabled: z.boolean(),
  postCount: z.number().int(),
  color: z.string(),
  /** SRS §11 persona: avatar gender age bio skills freq hours (D-38) */
  avatarUrl: z.string().nullable().default(null),
  gender: z.string().default(''),
  ageRange: z.string().default(''),
  bio: z.string().default(''),
  skills: z.string().default(''),
  postsPerDay: z.number().int().default(2),
  activeHours: z.string().default('8:00 – 22:00'),
});
export type Persona = z.infer<typeof personaSchema>;

export const personaUpsertSchema = z.object({
  name: z.string().trim().min(2).max(100),
  title: z.string().trim().max(100),
  province: z.string().trim().max(100),
  tone: z.string().trim().max(200),
  groupIds: z.array(z.string()).default([]),
  enabled: z.boolean().default(true),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default('#1677FF'),
  /** URL storage (presign `persona-avatar`, NA-26) hoặc null = dùng màu */
  avatarUrl: z.string().max(2000).nullable().default(null),
  gender: z.enum(['', 'Nam', 'Nữ', 'Khác']).default(''),
  ageRange: z.string().trim().max(20).default(''),
  bio: z.string().trim().max(200).default(''),
  skills: z.string().trim().max(200).default(''),
  postsPerDay: z.coerce.number().int().min(1).max(20).default(2),
  activeHours: z.string().trim().max(40).default('8:00 – 22:00'),
});

export const scriptLineSchema = z.object({ personaId: z.string(), body: z.string() });

export const scriptSchema = z.object({
  id: z.string(),
  topic: z.string(),
  groupIds: z.array(z.string()),
  lines: z.array(scriptLineSchema),
  enabled: z.boolean(),
  /** SRS §11 script: type delay_min run_at (D-40) */
  type: z.string().default('Hỏi đáp'),
  delayMinutes: z.number().int().default(5),
  runAt: z.string().nullable().default(null),
  inviteReal: z.boolean().default(true),
});
export type BotScript = z.infer<typeof scriptSchema>;

export const scriptUpsertSchema = z.object({
  topic: z.string().trim().min(2).max(200),
  groupIds: z.array(z.string()).min(1),
  lines: z.array(scriptLineSchema.extend({ body: z.string().trim().min(1) })).min(1),
  enabled: z.boolean().default(true),
  type: z.string().trim().min(1).max(60).default('Hỏi đáp'),
  delayMinutes: z.coerce.number().int().min(1).max(120).default(5),
  /** ISO; null = chạy thủ công */
  runAt: z.string().nullable().default(null),
  inviteReal: z.boolean().default(true),
});

export const scriptRunSchema = z.object({
  threadId: z.string(),
  status: z.enum(['pending', 'posted']),
});

export const botSettingsSchema = z.object({
  enabled: z.boolean(),
  requireReview: z.boolean(),
  delayMinutes: z.number().int().min(1).max(120),
  topics: z.array(z.string()),
  /** "Tự sinh kịch bản từ chủ đề" / "Tự trả lời thành viên thật" (D-36) */
  autoGenerate: z.boolean().default(true),
  replyToMembers: z.boolean().default(true),
});
export type BotSettings = z.infer<typeof botSettingsSchema>;
export const botSettingsPatchSchema = botSettingsSchema.partial();

export const BOT_LOG_STATUS = ['posted', 'pending'] as const;
export const botLogSchema = z.object({
  id: z.string(),
  scriptId: z.string(),
  topic: z.string(),
  groupNames: z.array(z.string()),
  status: z.enum(BOT_LOG_STATUS),
  createdAt: z.string(),
});
export type BotLogRow = z.infer<typeof botLogSchema>;
