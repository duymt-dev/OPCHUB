import { z } from 'zod';
import { auditLogRowSchema } from '../../../api-domains';
import { adminPriceConfigSchema, priceConfigSchema } from '../../../membership/pricing';

/** Mock pricing data only: validated prices and their actual audit, no credentials. */
export const pricingSnapshotSchema = z.strictObject({
  config: adminPriceConfigSchema.extend({ updatedAt: z.iso.datetime() }).strict(),
  settingsLog: z.array(auditLogRowSchema.refine((row) => row.tag === 'pricing')),
  audit: z.array(
    z.strictObject({
      id: z.string().min(1),
      actorId: z.string().nullable(),
      action: z.literal('pricing.update'),
      target: z.literal('price_config'),
      detail: z.string(),
      at: z.iso.datetime(),
      diff: z.strictObject({ before: priceConfigSchema, after: priceConfigSchema }).optional(),
    }),
  ),
});
export type PricingSnapshot = z.infer<typeof pricingSnapshotSchema>;
