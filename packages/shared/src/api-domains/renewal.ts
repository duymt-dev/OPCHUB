import { z } from 'zod';

export const renewalMilestoneSchema = z.enum(['D30', 'D7', 'D1']);
const milestones = z.object({ d30: z.boolean(), d7: z.boolean(), d1: z.boolean() }).strict();
const channels = z.object({ email: z.boolean(), app: z.boolean() }).strict();
export const renewalSettingsSchema = z.object({ milestones, channels }).strict();
export const renewalSettingsPatchSchema = z
  .object({
    milestones: milestones.partial().optional(),
    channels: channels.partial().optional(),
  })
  .strict();
export const renewalRowSchema = z.object({
  userId: z.string(),
  name: z.string(),
  email: z.string(),
  plan: z.enum(['personal', 'business']),
  validUntil: z.iso.datetime(),
  daysLeft: z.number().int().min(1).max(30),
  nextMilestone: renewalMilestoneSchema.nullable(),
  lastSentAt: z.iso.datetime().nullable(),
});
export const renewalCursorSchema = z
  .object({ validUntil: z.iso.datetime(), userId: z.string().min(1) })
  .strict();
export const renewalQuerySchema = z.object({
  cursor: z
    .string()
    .transform((s, ctx) => {
      try {
        return renewalCursorSchema.parse(JSON.parse(s));
      } catch {
        ctx.addIssue({ code: 'custom', message: 'Cursor không hợp lệ' });
        return z.NEVER;
      }
    })
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export const renewalListSchema = z.object({
  total: z.number().int().nonnegative(),
  items: z.array(renewalRowSchema),
  nextCursor: z.string().nullable(),
});
export const renewalSendSchema = z.union([
  z
    .object({
      userIds: z
        .array(z.string().min(1))
        .min(1)
        .max(500)
        .refine((ids) => new Set(ids).size === ids.length, 'Thành viên trùng lặp'),
    })
    .strict(),
  z.object({ all: z.literal(true) }).strict(),
]);
export const renewalSendResultSchema = z.object({
  sent: z.number().int().nonnegative(),
  channels: z.array(z.enum(['email', 'app'])),
});
export type RenewalSettings = z.infer<typeof renewalSettingsSchema>;
export type RenewalSettingsPatch = z.infer<typeof renewalSettingsPatchSchema>;
export type RenewalMilestone = z.infer<typeof renewalMilestoneSchema>;
export type RenewalRow = z.infer<typeof renewalRowSchema>;
export type RenewalQuery = z.infer<typeof renewalQuerySchema>;
export type RenewalSend = z.infer<typeof renewalSendSchema>;
export type RenewalSendResult = z.infer<typeof renewalSendResultSchema>;
export const DEFAULT_RENEWAL: RenewalSettings = {
  milestones: { d30: true, d7: true, d1: true },
  channels: { email: true, app: true },
};
