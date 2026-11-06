import { z } from 'zod';
import { regionalBankSchema, regionalRegionSchema } from './regional-directors';

const amount = z.number().int().nonnegative();
export const myRegionSchema = z.discriminatedUnion('state', [
  z.object({ state: z.literal('none') }),
  z.object({
    state: z.literal('director'),
    region: regionalRegionSchema,
    label: z.string(),
    provinces: z.array(z.string()),
    bank: regionalBankSchema.nullable(),
    kpi: z.object({
      revenue: amount,
      count: amount,
      share: amount,
      paid: amount,
      paidMonths: amount,
      due: amount,
    }),
    years: z
      .array(
        z.object({
          year: z.number().int().min(1).max(4),
          percent: amount,
          count: amount,
          revenue: amount,
          share: amount,
        }),
      )
      .length(4),
    affiliates: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          code: z.string(),
          customers: amount,
          revenue: amount,
          share: amount,
        }),
      )
      .max(50),
    more: amount,
    months: z
      .array(
        z.object({
          monthKey: z.string(),
          amount,
          status: z.enum(['paid', 'pending']),
          paidAt: z.iso.datetime().nullable(),
        }),
      )
      .max(24),
    payoutDate: z.string(),
  }),
]);
export type MyRegion = z.infer<typeof myRegionSchema>;
