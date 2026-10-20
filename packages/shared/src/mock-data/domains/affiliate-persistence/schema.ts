import { z } from 'zod';
import {
  affiliateBankSchema,
  affiliateCodeSchema,
  affiliateMonthSchema,
  affiliatePayoutRowSchema,
  affiliatePolicySchema,
  affiliateReferralSchema,
  auditLogRowSchema,
  feeRowSchema,
  notificationSchema,
} from '../../../api-domains';

const id = z.string().min(1).max(200);
const integer = z.number().int().nonnegative();
const agent = z.strictObject({
  userId: id,
  code: affiliateCodeSchema,
  name: z.string(),
  email: z.string(),
  rate: z.number().int().min(1).max(50),
  bank: affiliateBankSchema.nullable(),
});
const referral = z.strictObject({
  userId: id,
  agentId: id,
  row: affiliateReferralSchema,
  month: affiliateMonthSchema,
});
const audit = z.strictObject({
  id,
  actorId: id,
  action: z.string().startsWith('affiliate.'),
  target: z.string(),
  detail: z.string(),
  at: z.string(),
});
const entries = <T extends z.ZodType>(value: T) =>
  z
    // Receipt keys include actor/id/month plus a valid 200-character idempotency key.
    .array(z.tuple([z.string().min(1), value]))
    .refine((rows) => new Set(rows.map(([key]) => key)).size === rows.length, {
      message: 'Duplicate persisted map key',
    });

/** Fake financial domain only: no passwords, bearer credentials, roles or grants. */
export const affiliateSnapshotSchema = z
  .strictObject({
    version: z.literal(1),
    demoSeeded: z.boolean(),
    fees: z.array(feeRowSchema),
    agents: entries(agent),
    referrals: entries(referral),
    payouts: entries(z.array(affiliatePayoutRowSchema)),
    knownFees: entries(z.string().nullable()),
    clicks: entries(entries(integer)),
    seen: entries(integer),
    seq: integer,
    dbSeq: integer,
    policy: affiliatePolicySchema,
    snapshots: entries(
      z.strictObject({ paidAt: z.string().nullable(), bank: affiliateBankSchema.nullable() }),
    ),
    receipts: entries(z.strictObject({ paid: integer, amount: integer })),
    notices: entries(z.array(notificationSchema.refine((row) => row.type === 'affiliate'))),
    settingsLog: z.array(auditLogRowSchema.refine((row) => row.tag === 'affiliate')),
    audit: z.array(audit),
  })
  .superRefine((value, ctx) => {
    const agents = new Set(value.agents.map(([key]) => key));
    const fees = new Set(value.fees.map((fee) => fee.userId));
    const invalid = (message: string) => ctx.addIssue({ code: 'custom', message });
    if (fees.size !== value.fees.length) invalid('Duplicate persisted fee user');
    if (new Set(value.agents.map(([, a]) => a.code)).size !== value.agents.length)
      invalid('Duplicate persisted affiliate code');
    for (const [key, a] of value.agents)
      if (key !== a.userId || !fees.has(key)) invalid('Invalid persisted affiliate owner');
    for (const [key, r] of value.referrals)
      if (key !== r.userId || !fees.has(key) || !agents.has(r.agentId))
        invalid('Invalid persisted referral owner');
    if (new Set(value.referrals.map(([, r]) => r.row.id)).size !== value.referrals.length)
      invalid('Duplicate persisted commission id');
    for (const [key] of value.payouts)
      if (!agents.has(key)) invalid('Invalid persisted payout owner');
  });

export type AffiliateSnapshot = z.infer<typeof affiliateSnapshotSchema>;
