import { z } from 'zod';

/** D-119: defaults belong to the database/seed, never a client-side fallback. */
export const revenueSharingPolicySchema = z
  .object({
    yearOneRate: z.number().int().min(0).max(100),
    annualDecrease: z.number().int().min(0).max(100),
    minimumRate: z.number().int().min(0).max(100),
  })
  .strict()
  .refine((p) => p.minimumRate <= p.yearOneRate, {
    path: ['minimumRate'],
    message: 'Mức tối thiểu không được vượt tỷ lệ năm đầu',
  });

export type RevenueSharingPolicy = z.infer<typeof revenueSharingPolicySchema>;

export const revenueShareStatusSchema = z.enum(['recorded', 'paid']);
export type RevenueShareStatus = z.infer<typeof revenueShareStatusSchema>;
