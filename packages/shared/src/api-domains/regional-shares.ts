import { z } from 'zod';
import { COMMISSION_PLAN } from './affiliate';
import {
  regionalRegionSchema,
  regionalMemberSchema,
  regionalBankSchema,
} from './regional-directors';

const money = z.number().int().nonnegative();
export const regionalShareQuerySchema = z.object({ q: z.string().trim().max(100).default('') });
export const regionalSharePageQuerySchema = z.object({
  cursor: z.string().max(1000).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(8),
});
export const regionalShareCursorSchema = z.object({
  recordedAt: z.iso.datetime(),
  id: z.string().min(1),
});
export const regionalPayoutBodySchema = z.object({ directorUserId: z.string().min(1) });
export const regionalPayoutResultSchema = z.object({
  id: z.string(),
  amount: money,
  count: money,
  monthKeys: z.array(z.string()),
  directorUserId: z.string(),
  directorName: z.string(),
  bankHolder: z.string(),
});
export const regionalPayeeSchema = z.object({
  userId: z.string(),
  fullName: z.string(),
  due: money,
  monthKeys: z.array(z.string()),
  bank: regionalBankSchema.nullable(),
});
export const regionalShareSummarySchema = z.object({
  kpi: z.object({
    total: money,
    count: money,
    affiliates: money,
    due: money,
    paid: money,
    payoutDate: z.string(),
  }),
  rule: z.object({
    years: z.array(z.object({ year: z.number().int(), percent: z.number().int() })),
    min: z.number().int(),
  }),
  rows: z.array(
    z.object({
      region: regionalRegionSchema,
      label: z.string(),
      member: regionalMemberSchema.nullable(),
      provinces: money,
      bank: regionalBankSchema.nullable(),
      affiliates: money,
      count: money,
      total: money,
      paid: money,
      due: money,
      pendingCurrent: money,
      payees: z.array(regionalPayeeSchema),
    }),
  ),
});
export const regionalShareItemSchema = z.object({
  id: z.string(),
  recordedAt: z.iso.datetime(),
  customerName: z.string(),
  affiliateName: z.string(),
  plan: z.enum(COMMISSION_PLAN),
  baseAmount: money,
  customerYear: z.number().int().positive(),
  percent: z.number().int(),
  directorAmount: money,
  status: z.enum(['pending', 'paid']),
});
export const regionalSharePageSchema = z.object({
  items: z.array(regionalShareItemSchema),
  nextCursor: z.string().nullable(),
  more: money,
});
export const regionalPayoutHistorySchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      monthKeys: z.array(z.string()),
      paidAt: z.iso.datetime(),
      amount: money,
      directorName: z.string(),
    }),
  ),
});
export type RegionalShareSummary = z.infer<typeof regionalShareSummarySchema>;
export type RegionalSharePage = z.infer<typeof regionalSharePageSchema>;
export type RegionalPayee = z.infer<typeof regionalPayeeSchema>;
export type RegionalPayoutResult = z.infer<typeof regionalPayoutResultSchema>;
