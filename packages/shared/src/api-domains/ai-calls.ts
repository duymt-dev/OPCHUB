import { z } from 'zod';
import { AI_PROVIDER_IDS, AI_PURPOSES } from './ai-provider-catalog';
import { auditLogPageQuerySchema, encodeAuditLogCursor } from './audit-log-page';

const filters = z.strictObject({
  from: z.iso.datetime({ offset: true }).optional(),
  to: z.iso.datetime({ offset: true }).optional(),
  purpose: z.enum(AI_PURPOSES).optional(),
  provider: z.enum(AI_PROVIDER_IDS).optional(),
  status: z.enum(['ok', 'error', 'fallback']).optional(),
});
function dateRange<T extends z.infer<typeof filters>>(value: T, ctx: z.RefinementCtx) {
  const now = Date.now();
  const to = value.to ?? new Date(now).toISOString();
  // Seven VN calendar days including today; timestamps are transported in UTC.
  const from =
    value.from ??
    new Date(
      Math.floor((now + 7 * 3600000) / 86400000) * 86400000 - 7 * 3600000 - 6 * 86400000,
    ).toISOString();
  const range = Date.parse(to) - Date.parse(from);
  if (range < 0 || range > 90 * 86400000) {
    ctx.addIssue({ code: 'custom', path: ['from'], message: 'Khoảng ngày phải từ 0 đến 90 ngày' });
    return z.NEVER;
  }
  return { ...value, from, to };
}
export const aiCallsFilterSchema = filters.transform(dateRange);
export const aiCallsQuerySchema = filters
  .extend(auditLogPageQuerySchema.shape)
  .transform(dateRange);
export const encodeAiCallsCursor = encodeAuditLogCursor;
export const aiCallItemSchema = z.strictObject({
  id: z.string(),
  at: z.iso.datetime(),
  purpose: z.enum(AI_PURPOSES),
  provider: z.enum(AI_PROVIDER_IDS),
  model: z.string(),
  promptTokens: z.number().int().nonnegative(),
  completionTokens: z.number().int().nonnegative(),
  cost: z.number().int().nonnegative().safe(),
  latencyMs: z.number().int().nonnegative(),
  status: z.enum(['ok', 'error', 'fallback']),
  errorCode: z.string().nullable(),
  actor: z
    .strictObject({ realm: z.enum(['member', 'admin', 'system']), id: z.string().nullable() })
    .optional(),
});
export const aiCallsPageSchema = z.strictObject({
  items: z.array(aiCallItemSchema),
  nextCursor: z.string().nullable(),
  totals: z.strictObject({
    calls: z.number().int().nonnegative().safe(),
    cost: z.number().int().nonnegative().safe(),
    promptTokens: z.number().int().nonnegative().safe(),
    completionTokens: z.number().int().nonnegative().safe(),
  }),
});
export type AiCallsFilter = z.infer<typeof aiCallsFilterSchema>;
export type AiCallsQuery = z.infer<typeof aiCallsQuerySchema>;
export type AiCallItem = z.infer<typeof aiCallItemSchema>;
export type AiCallsPage = z.infer<typeof aiCallsPageSchema>;
