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
});
export type Persona = z.infer<typeof personaSchema>;

export const personaUpsertSchema = z.object({
  name: z.string().trim().min(2).max(100),
  title: z.string().trim().min(1).max(100),
  province: z.string().trim().min(1),
  tone: z.string().trim().max(200),
  groupIds: z.array(z.string()).default([]),
  enabled: z.boolean().default(true),
});

export const scriptLineSchema = z.object({ personaId: z.string(), body: z.string() });

export const scriptSchema = z.object({
  id: z.string(),
  topic: z.string(),
  groupIds: z.array(z.string()),
  lines: z.array(scriptLineSchema),
  enabled: z.boolean(),
});
export type BotScript = z.infer<typeof scriptSchema>;

export const scriptUpsertSchema = z.object({
  topic: z.string().trim().min(2).max(200),
  groupIds: z.array(z.string()).min(1),
  lines: z.array(scriptLineSchema.extend({ body: z.string().trim().min(1) })).min(1),
  enabled: z.boolean().default(true),
});

export const scriptRunSchema = z.object({ threadId: z.string(), status: z.literal('pending') });

export const botSettingsSchema = z.object({
  enabled: z.boolean(),
  requireReview: z.boolean(),
  delayMinutes: z.number().int().min(1).max(120),
  topics: z.array(z.string()),
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
