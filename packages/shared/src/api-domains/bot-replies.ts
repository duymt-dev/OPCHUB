import { z } from 'zod';

/** D-112: separate second-based cadence, not the conversation minute setting. */
export const botReplySettingsSchema = z.strictObject({
  autoEnabled: z.boolean(),
  sampleSize: z.number().int().min(1).max(200),
  delaySeconds: z.number().int().min(1).max(600),
});
export const botReplySettingsPatchSchema = botReplySettingsSchema.partial();
export const botReplyControlSchema = botReplySettingsSchema.omit({ autoEnabled: true }).extend({
  lastScanAt: z.iso.datetime().nullable(),
});
export type BotReplySettings = z.infer<typeof botReplySettingsSchema>;
export const DEFAULT_BOT_REPLY_SETTINGS: BotReplySettings = {
  autoEnabled: true,
  sampleSize: 50,
  delaySeconds: 5,
};

export const botReplyRunSchema = z
  .strictObject({
    id: z.string().min(1),
    groupId: z.string().min(1),
    groupName: z.string(),
    status: z.enum(['running', 'stopped', 'done']),
    total: z.number().int().min(1).max(200),
    processed: z.number().int().nonnegative(),
    posted: z.number().int().nonnegative(),
    manual: z.boolean(),
    createdAt: z.iso.datetime(),
  })
  .superRefine((value, ctx) => {
    if (value.processed > value.total)
      ctx.addIssue({ code: 'custom', path: ['processed'], message: 'Tiến độ vượt tổng số tin' });
    if (value.posted > value.processed)
      ctx.addIssue({ code: 'custom', path: ['posted'], message: 'Số phản hồi vượt số đã xử lý' });
  });

export const botReplyCandidateSchema = z.strictObject({
  id: z.string().min(1),
  senderName: z.string(),
  body: z.string(),
  createdAt: z.iso.datetime(),
});
export const botReplyGroupSchema = z.strictObject({
  groupId: z.string().min(1),
  groupName: z.string(),
  roomId: z.string().min(1),
  pending: z.number().int().min(1).max(200),
  personaCount: z.number().int().nonnegative(),
  preview: z.array(botReplyCandidateSchema).max(8),
});
export const botReplyHistorySchema = z.strictObject({
  id: z.string().min(1),
  groupId: z.string().min(1),
  groupName: z.string(),
  roomId: z.string().min(1),
  replyToId: z.string().min(1),
  personaName: z.string(),
  body: z.string(),
  createdAt: z.iso.datetime(),
});
export const botReplyOverviewSchema = z.strictObject({
  settings: botReplySettingsSchema,
  lastScanAt: z.iso.datetime().nullable(),
  pendingTotal: z.number().int().nonnegative(),
  groupCount: z.number().int().nonnegative(),
  groups: z.array(botReplyGroupSchema).max(10),
  run: botReplyRunSchema.nullable(),
  history: z.array(botReplyHistorySchema).max(100),
});
export const botReplyScanSchema = z.strictObject({});
export const botReplyScanResultSchema = z.strictObject({ run: botReplyRunSchema.nullable() });
export type BotReplyOverview = z.infer<typeof botReplyOverviewSchema>;
export type BotReplyRun = z.infer<typeof botReplyRunSchema>;
