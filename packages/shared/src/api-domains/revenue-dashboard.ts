import { z } from 'zod';
import { affiliateBankSchema } from './affiliate';
import { directorRegionSchema } from './regional-directors';
import { revenueBalanceSchema, revenueTotalSchema } from './revenue-ledger';
import { revenueSharingPolicySchema } from './revenue-sharing';

export const revenueStatsSchema = revenueBalanceSchema.extend({
  affiliateCount: revenueTotalSchema,
});
export type RevenueStats = z.infer<typeof revenueStatsSchema>;
/** Lifetime retained revenue: the Affiliate outer header uses affiliateAttributed, not allReceipts. */
export const revenueRetainedSchema = z
  .strictObject({
    allReceipts: revenueTotalSchema,
    affiliateAttributed: revenueTotalSchema,
  })
  .refine(
    (r) =>
      revenueTotalSchema.safeParse(r.allReceipts).success &&
      revenueTotalSchema.safeParse(r.affiliateAttributed).success &&
      BigInt(r.affiliateAttributed) <= BigInt(r.allReceipts),
    { message: 'Affiliate retained revenue must be a subset of all receipts' },
  );
export type RevenueRetained = z.infer<typeof revenueRetainedSchema>;
export const revenueDirectorSchema = z.object({
  id: z.string(),
  directorId: z.string().nullable(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  region: directorRegionSchema,
  provinces: z.array(z.string()),
  current: z.boolean(),
  bank: affiliateBankSchema.nullable(),
  stats: revenueStatsSchema,
});
export type RevenueDirector = z.infer<typeof revenueDirectorSchema>;
export const revenueDashboardQuerySchema = z.strictObject({
  q: z.string().trim().max(200).default(''),
});
export const revenueDashboardSchema = z.object({
  asOf: z.iso.datetime(),
  policy: revenueSharingPolicySchema,
  items: z.array(revenueDirectorSchema).length(3),
  stats: revenueStatsSchema,
  visible: z.object({
    ids: z.array(z.string()),
    due: revenueTotalSchema,
    paid: revenueTotalSchema,
  }),
});
export type RevenueDashboard = z.infer<typeof revenueDashboardSchema>;
export const revenueFormerQuerySchema = z.strictObject({
  beforeId: z.string().min(1).max(100).optional(),
  size: z.coerce.number().int().min(1).max(100).default(20),
});
export type RevenueFormerQuery = z.infer<typeof revenueFormerQuerySchema>;
export const revenueFormerSchema = z.object({
  items: z.array(revenueDirectorSchema),
  nextCursor: z.string().nullable(),
});
