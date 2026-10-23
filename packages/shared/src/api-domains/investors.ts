import { z } from 'zod';

/** SRS §13 Investors — /projects/:id/interest, /admin/investors (D-72: không trạng thái, không luồng trao đổi) */

export const INVESTOR_KINDS = ['individual', 'business', 'fund'] as const;

export const investorInterestSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  projectName: z.string(),
  investorName: z.string(),
  avatarUrl: z.string().nullable(),
  kind: z.enum(INVESTOR_KINDS),
  organization: z.string(),
  phone: z.string(),
  amount: z.number().int(),
  currency: z.enum(['VND', 'USD']),
  message: z.string(),
  createdAt: z.string(),
});
export type InvestorInterest = z.infer<typeof investorInterestSchema>;

export const investorQuerySchema = z.object({ kind: z.enum(INVESTOR_KINDS).optional() });

export const createInterestSchema = z.object({
  kind: z.enum(INVESTOR_KINDS),
  organization: z.string().trim().max(200).default(''),
  phone: z.string().trim().min(6).max(20),
  amount: z.number().int().min(0),
  currency: z.enum(['VND', 'USD']).default('VND'),
  message: z.string().trim().min(1).max(1000),
});
export type CreateInterestRequest = z.input<typeof createInterestSchema>;
