import { z } from 'zod';
import { affiliateMonthSchema } from './affiliate';
import { revenueShareStatusSchema } from './revenue-sharing';

/** SQL aggregate values stay exact even beyond Number.MAX_SAFE_INTEGER. */
export const revenueTotalSchema = z
  .string()
  .regex(/^(0|[1-9]\d*)$/)
  .max(30);
export const revenueBalanceSchema = z.object({
  receiptCount: revenueTotalSchema,
  received: revenueTotalSchema,
  allocated: revenueTotalSchema,
  paid: revenueTotalSchema,
  due: revenueTotalSchema,
  mediaSoft: revenueTotalSchema,
});
export type RevenueBalance = z.infer<typeof revenueBalanceSchema>;

export const revenueLedgerQuerySchema = z
  .strictObject({
    beforeAt: z.iso.datetime().optional(),
    beforeId: z.uuid().optional(),
    size: z.coerce.number().int().min(1).max(100).default(8),
  })
  .refine((q) => Boolean(q.beforeAt) === Boolean(q.beforeId), {
    path: ['beforeId'],
    message: 'Con trỏ cần thời điểm và mã khoản chia sẻ',
  });
export type RevenueLedgerQuery = z.infer<typeof revenueLedgerQuerySchema>;

export const revenueLedgerItemSchema = z.object({
  id: z.uuid(),
  customerId: z.string(),
  customerName: z.string().nullable(),
  affiliateId: z.string().nullable(),
  affiliateName: z.string().nullable(),
  plan: z.enum(['personal', 'business', 'fundraising']),
  receivedAt: z.iso.datetime(),
  recordedAt: z.iso.datetime(),
  firstReceivedAt: z.iso.datetime(),
  customerYear: z.number().int().positive(),
  amount: z.number().int().positive(),
  directorRate: z.number().int().min(0).max(100),
  directorAmount: z.number().int().nonnegative(),
  mediaSoftAmount: z.number().int().nonnegative(),
  monthKey: affiliateMonthSchema,
  status: revenueShareStatusSchema,
  payoutId: z.uuid().nullable(),
});
export type RevenueLedgerItem = z.infer<typeof revenueLedgerItemSchema>;
export const revenueLedgerSchema = z.object({
  items: z.array(revenueLedgerItemSchema),
  nextCursor: z.object({ at: z.iso.datetime(), id: z.uuid() }).nullable(),
});

export const revenueMonthsQuerySchema = z.strictObject({
  beforeMonth: affiliateMonthSchema.optional(),
  size: z.coerce.number().int().min(1).max(100).default(20),
});
export type RevenueMonthsQuery = z.infer<typeof revenueMonthsQuerySchema>;
export const revenueMonthsSchema = z.object({
  items: z.array(revenueBalanceSchema.extend({ monthKey: affiliateMonthSchema })),
  nextCursor: affiliateMonthSchema.nullable(),
});
