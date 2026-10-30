import { z } from 'zod';
import { affiliateBankSchema } from '../api-domains/affiliate';
import { directorRegionSchema } from '../api-domains/regional-directors';
import { revenueSharingPolicySchema } from '../api-domains/revenue-sharing';

const id = z.string().min(1).max(100);
export const revenueReceiptSchema = z
  .strictObject({
    source: z.enum(['membership', 'fundraising']),
    sourceId: id,
    customerId: id,
    plan: z.enum(['personal', 'business', 'fundraising']),
    amount: z.number().int().min(0).max(2_147_483_647),
    receivedAt: z.iso.datetime(),
    recordedAt: z.iso.datetime(),
  })
  .refine((p) => (p.source === 'fundraising') === (p.plan === 'fundraising'), {
    path: ['plan'],
    message: 'Gói không khớp nguồn thực thu',
  });
export type RevenueReceipt = z.infer<typeof revenueReceiptSchema>;

/** Captured inside reconciliation; worker never re-resolves a later incumbent or policy. */
export const revenueReceivedSchema = z
  .strictObject({
    receipt: revenueReceiptSchema.refine((p) => p.amount > 0, 'Không ghi khoản 0đ'),
    firstReceivedAt: z.iso.datetime(),
    policy: revenueSharingPolicySchema,
    affiliateId: id.nullable(),
    region: directorRegionSchema.nullable(),
    director: z
      .strictObject({
        id,
        name: z.string().min(1).max(250),
        bank: affiliateBankSchema.nullable(),
      })
      .nullable(),
  })
  .refine((p) => new Date(p.firstReceivedAt) <= new Date(p.receipt.receivedAt), {
    path: ['firstReceivedAt'],
    message: 'Mốc thực thu đầu không được sau giao dịch',
  })
  .refine((p) => p.director === null || (p.affiliateId !== null && p.region !== null), {
    path: ['director'],
    message: 'GĐ Vùng nhận chia sẻ phải có nguồn giới thiệu và vùng',
  });
