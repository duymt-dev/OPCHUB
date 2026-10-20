import { z } from 'zod';
import { pageSchema } from '../api';
import {
  affiliateBankSchema,
  affiliateMonthSchema,
  affiliatePageQuerySchema,
  affiliateReferralSchema,
} from './affiliate';

export const affiliateCommissionStatusSchema = z.enum(['recorded', 'paid', 'cancelled']);
export const affiliateCommissionQuerySchema = affiliatePageQuerySchema.extend({
  status: z.enum(['all', 'recorded', 'paid', 'cancelled']).default('all'),
});
export type AffiliateCommissionQuery = z.infer<typeof affiliateCommissionQuerySchema>;
export const affiliateIdsSchema = z.array(z.string().min(1).max(100)).min(1).max(100);
export const affiliateRateSchema = z.object({ rate: z.number().int().min(1).max(50) });
export const affiliateBulkRateSchema = affiliateRateSchema.extend({ ids: affiliateIdsSchema });
export const affiliateCancelSchema = z.object({
  ids: affiliateIdsSchema,
  reason: z.string().trim().min(1).max(500),
});
export const affiliateExportSchema = z.object({
  ids: affiliateIdsSchema.optional(),
  q: z.string().max(200).optional(),
  status: z.enum(['all', 'recorded', 'paid', 'cancelled']).optional(),
});
export const affiliateSummarySchema = z.object({
  revenue: z.number().int(),
  totalCommission: z.number().int(),
  payable: z.number().int(),
  paid: z.number().int().min(0),
  netRevenue: z.number().int(),
});
export const affiliateCommissionRowSchema = z.object({
  id: z.string(),
  affiliateId: z.string(),
  affiliateName: z.string(),
  code: z.string(),
  customerName: z.string(),
  date: z.string(),
  feeAmount: z.number().int(),
  rate: z.number().int(),
  amount: z.number().int(),
  status: affiliateCommissionStatusSchema,
  cancelReason: z.string().nullable(),
});
export const affiliateCommissionsSchema = pageSchema(affiliateCommissionRowSchema);
export const affiliateAdminRowSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  email: z.string(),
  code: z.string(),
  rate: z.number().int(),
  status: z.enum(['active', 'paused']),
  source: z.literal('auto'),
  customers: z.number().int(),
  revenue: z.number().int(),
  balance: z.number().int(),
  paid: z.number().int(),
  monthStatus: z.string(),
  hasBank: z.boolean(),
});
export type AffiliateAdminRow = z.infer<typeof affiliateAdminRowSchema>;
export const affiliateAdminPageSchema = pageSchema(affiliateAdminRowSchema);
export const affiliateDetailSchema = affiliateAdminRowSchema.extend({
  bank: affiliateBankSchema.nullable(),
  stats: z.object({
    customers: z.number().int(),
    revenue: z.number().int(),
    commission: z.number().int(),
    paid: z.number().int(),
  }),
});
export const affiliateMonthRowSchema = z.object({
  monthKey: z.string(),
  customers: z.number().int(),
  amount: z.number().int(),
  status: z.enum(['recorded', 'paid', 'cancelled', 'mixed']),
  paidAt: z.string().nullable(),
  payable: z.number().int(),
});
export const affiliateMonthsSchema = pageSchema(affiliateMonthRowSchema);
export const affiliateAdminCustomersSchema = pageSchema(
  affiliateReferralSchema.extend({
    paidAt: z.string().nullable(),
    bank: affiliateBankSchema.nullable(),
  }),
);
export const affiliatePayoutRequestSchema = z.object({ monthKey: affiliateMonthSchema });
export const affiliatePayoutResultSchema = z.object({
  paid: z.number().int(),
  amount: z.number().int(),
});
export const affiliateCancelResultSchema = z.object({ cancelled: z.number().int() });
export const affiliateRateResultSchema = z.object({ updated: z.number().int() });
export const affiliateIdParamsSchema = z.object({ id: z.string().min(1).max(100) });
export const affiliateSummaryQuerySchema = affiliatePageQuerySchema.pick({ month: true });
export const affiliatePayoutKeySchema = z.object({ idempotencyKey: z.string().min(1).max(200) });
