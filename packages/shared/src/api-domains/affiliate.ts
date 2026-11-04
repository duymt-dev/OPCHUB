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
/** D-110: gói thực trả của khoản hoa hồng (snapshot `commissions.plan`) */
export const COMMISSION_PLAN = ['personal', 'business', 'fundraising'] as const;
export type CommissionPlan = (typeof COMMISSION_PLAN)[number];
/** Nhãn gói như prototype v4.2 (`afv` plan) */
export const COMMISSION_PLAN_LABEL: Record<CommissionPlan, string> = {
  personal: 'Gói Cá nhân 12 tháng',
  business: 'Gói Doanh nghiệp 12 tháng',
  fundraising: 'Gói Gọi vốn · 6 tháng',
};
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
  renewalRate: z.number().int().min(0).max(50).default(10),
  renewalMaxYear: z.number().int().min(1).max(10).default(3),
  regionalFirstYear: z.number().int().min(1).max(100).default(50),
  regionalStep: z.number().int().min(0).max(100).default(10),
  regionalMin: z.number().int().min(0).max(100).default(20),
  defaultRate: z.number().int().min(1).max(50),
  cookieDays: z.number().int().min(1).max(365),
  /** D-70: % hoa hồng Gói Gọi vốn, ghi khi Admin duyệt */
  fundraisingRate: z.number().int().min(1).max(50),
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
  renewalRate: z.number().int().min(0).max(50).default(10),
  renewalMaxYear: z.number().int().min(1).max(10).default(3),
  rate: z.number().int(),
  perAmount: z.number().int(),
  /** BR-AFF-REV (v4.2 `perT`): hoa hồng theo gói thực trả — Doanh nghiệp, Gói Gọi vốn (% riêng) */
  bizAmount: z.number().int().default(0),
  fundAmount: z.number().int().default(0),
  fundRate: z.number().int().default(0),
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
  q: z.string().trim().max(200).optional(),
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
  customerYear: z.number().int().positive().default(1),
  source: z.enum(['membership', 'fundraising']).default('membership'),
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
  z.object({
    valid: z.literal(true),
    affiliateName: z.string(),
    cookieDays: z.number().int().min(1).max(365),
  }),
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
