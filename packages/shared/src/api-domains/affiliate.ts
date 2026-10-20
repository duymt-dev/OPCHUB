import { z } from 'zod';
import { pageSchema } from '../api';
import { pageQuerySchema } from './common';

export const AFFILIATE_BANKS = [
  'Vietcombank',
  'VietinBank',
  'BIDV',
  'Agribank',
  'Techcombank',
  'MB Bank',
  'ACB',
  'VPBank',
  'Sacombank',
  'TPBank',
  'HDBank',
  'VIB',
  'SHB',
  'OCB',
  'MSB',
] as const;
export const affiliateCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(4)
  .max(12)
  .regex(/^[A-Z0-9]+$/);
export const affiliateMonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
export const affiliateBankSchema = z.object({
  bankName: z.enum(AFFILIATE_BANKS),
  bankNo: z
    .string()
    .trim()
    .regex(/^\d{6,19}$/, 'Số tài khoản gồm 6–19 chữ số'),
  bankHolder: z
    .string()
    .trim()
    .min(1)
    .max(150)
    .transform((s) =>
      s
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toUpperCase()
        .replace(/\s+/g, ' '),
    )
    .pipe(z.string().regex(/^[A-Z ]+$/, 'Tên chủ tài khoản chỉ gồm chữ cái')),
});
export type AffiliateBank = z.infer<typeof affiliateBankSchema>;
export const affiliatePolicySchema = z.object({
  defaultRate: z.number().int().min(1).max(50),
  cookieDays: z.number().int().min(1).max(365),
  terms: z.string().max(5000),
});
export type AffiliatePolicy = z.infer<typeof affiliatePolicySchema>;
export const affiliateStatsSchema = z.object({
  clicks30d: z.number().int().min(0),
  paidCount: z.number().int().min(0),
  conversionPct: z.number().min(0),
  thisMonth: z.number().int().min(0),
  carryOver: z.number().int().min(0),
  received: z.number().int().min(0),
});
const affiliatePolicyPreviewSchema = z.object({
  rate: z.number().int(),
  perAmount: z.number().int(),
  cookieDays: z.number().int(),
});
export const myAffiliateSchema = z.discriminatedUnion('state', [
  z.object({ state: z.literal('locked'), policy: affiliatePolicyPreviewSchema }),
  z.object({
    state: z.enum(['active', 'paused']),
    policy: affiliatePolicyPreviewSchema,
    code: z.string(),
    link: z.string(),
    bank: affiliateBankSchema.nullable(),
    stats: affiliateStatsSchema,
  }),
]);
export type MyAffiliate = z.infer<typeof myAffiliateSchema>;
export const affiliatePageQuerySchema = pageQuerySchema(10).extend({
  month: affiliateMonthSchema.optional(),
});
export type AffiliatePageQuery = z.infer<typeof affiliatePageQuerySchema>;
export const affiliateCustomerStatusSchema = z.enum([
  'pending',
  'void',
  'recorded',
  'paid',
  'cancelled',
]);
export const affiliateReferralSchema = z.object({
  id: z.string(),
  name: z.string(),
  plan: z.string(),
  date: z.string(),
  feeAmount: z.number().int(),
  commission: z.number().int(),
  rate: z.number().int(),
  status: affiliateCustomerStatusSchema,
  cancelReason: z.string().nullable(),
});
export const affiliateReferralsSchema = pageSchema(affiliateReferralSchema).extend({
  months: z.array(z.string()),
  summary: z.object({ count: z.number().int(), commission: z.number().int(), status: z.string() }),
});
export type AffiliateReferrals = z.infer<typeof affiliateReferralsSchema>;
export const affiliatePayoutRowSchema = z.object({
  monthKey: z.string(),
  amount: z.number().int(),
  count: z.number().int(),
  paidAt: z.string(),
  bank: affiliateBankSchema,
});
export const affiliatePayoutsSchema = pageSchema(affiliatePayoutRowSchema);
export type AffiliatePayouts = z.infer<typeof affiliatePayoutsSchema>;
export const affiliateCodeResultSchema = z.discriminatedUnion('valid', [
  z.object({ valid: z.literal(true), affiliateName: z.string() }),
  z.object({
    valid: z.literal(false),
    reason: z.enum(['not_found', 'self', 'paused']),
    message: z.string(),
  }),
]);
export type AffiliateCodeResult = z.infer<typeof affiliateCodeResultSchema>;
export const affiliateCodeQuerySchema = z.object({ email: z.email().optional() });
export const affiliateCodeParamsSchema = z.object({
  code: z.string().trim().toUpperCase().max(100),
});
export const affiliateClickSchema = z.object({ code: affiliateCodeSchema });
