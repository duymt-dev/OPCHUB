import { z } from 'zod';
import { affiliateBankSchema, affiliateMonthSchema } from './affiliate';
import { directorRegionSchema } from './regional-directors';

const directorId = z.string().trim().min(1).max(100);
export const revenueDirectorParamsSchema = z.strictObject({ directorId });
export const revenuePayoutRequestSchema = z.strictObject({ monthKey: affiliateMonthSchema });
/** Aggregate VND can exceed Number.MAX_SAFE_INTEGER; decimal strings preserve exact totals. */
export const revenuePayoutSchema = z.object({
  id: z.uuid(),
  directorId,
  directorName: z.string(),
  region: directorRegionSchema,
  monthKey: affiliateMonthSchema,
  amount: z
    .string()
    .regex(/^[1-9]\d*$/)
    .max(19),
  shareCount: z.number().int().positive(),
  bank: affiliateBankSchema,
  paidBy: z.string(),
  paidAt: z.iso.datetime(),
});
export type RevenuePayoutReceipt = z.infer<typeof revenuePayoutSchema>;
const cursorSchema = z.object({ at: z.iso.datetime(), id: z.uuid() });
export const revenuePayoutHistoryQuerySchema = z
  .object({
    directorId: directorId.optional(),
    beforeAt: z.iso.datetime().optional(),
    beforeId: z.uuid().optional(),
    size: z.coerce.number().int().min(1).max(100).default(20),
  })
  .refine((q) => Boolean(q.beforeAt) === Boolean(q.beforeId), {
    path: ['beforeId'],
    message: 'Con trỏ cần thời điểm và mã biên lai',
  });
export type RevenuePayoutHistoryQuery = z.infer<typeof revenuePayoutHistoryQuerySchema>;
export const revenuePayoutHistorySchema = z.object({
  items: z.array(revenuePayoutSchema),
  nextCursor: cursorSchema.nullable(),
});
