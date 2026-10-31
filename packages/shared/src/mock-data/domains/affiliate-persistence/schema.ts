import { z } from 'zod';
import { GROUP_MEMBER_STATUS } from '../../../enums';
import { mockDirectorSnapshotSchema } from '../regional-directors/schema';
import { mockRevenueSnapshotSchema } from '../revenue-sharing/schema';
import {
  affiliateBankSchema,
  affiliateCodeSchema,
  affiliateMonthSchema,
  affiliatePayoutRowSchema,
  affiliatePolicySchema,
  affiliateReferralSchema,
  auditLogRowSchema,
  COMMISSION_PLAN,
  feeRowSchema,
  notificationSchema,
} from '../../../api-domains';

const id = z.string().min(1);
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
  /** D-110: gói thực trả của khoản (snapshot) */
  plan: z.enum(COMMISSION_PLAN).optional(),
});
const audit = z.strictObject({
  id,
  actorId: id,
  action: z.string().refine(isPersistedAffiliateAction),
  target: z.string(),
  detail: z.string(),
  at: z.string(),
  diff: z.record(z.string(), z.unknown()).optional(),
});
export function isPersistedAffiliateAction(action: string): boolean {
  return action.startsWith('affiliate.') || action.startsWith('regional_director.');
}
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
    // Legacy mock ledgers predate this metadata; retain every financial row on upgrade.
    welcomeSeen: z.array(id).default([]),
    webhooks: entries(integer),
    fees: z.array(feeRowSchema),
    // Optional for legacy ledgers, but an exemption without its original fee is unsafe.
    directors: mockDirectorSnapshotSchema.optional(),
    revenue: mockRevenueSnapshotSchema.optional(),
    agents: entries(agent),
    referrals: entries(referral),
    payouts: entries(z.array(affiliatePayoutRowSchema)),
    knownFees: entries(z.string().nullable()),
    memberships: entries(entries(z.enum(GROUP_MEMBER_STATUS))).optional(),
    clicks: entries(entries(integer)),
    seen: entries(integer),
    seq: integer,
    dbSeq: integer,
    // Sharing policy lives only in revenue.policy. Keep legacy financial snapshots readable.
    policy: z.object({
      defaultRate: affiliatePolicySchema.shape.defaultRate,
      cookieDays: affiliatePolicySchema.shape.cookieDays,
      fundraisingRate: affiliatePolicySchema.shape.fundraisingRate,
      terms: affiliatePolicySchema.shape.terms,
    }),
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
    if (
      value.memberships &&
      (value.memberships.length !== agents.size ||
        value.memberships.some(([owner]) => !agents.has(owner)))
    )
      invalid('Persisted memberships must cover every affiliate owner');
    if (fees.size !== value.fees.length) invalid('Duplicate persisted fee user');
    const incumbents = new Set(
      value.directors?.config.slots.flatMap((slot) =>
        slot.incumbent ? [slot.incumbent.id] : [],
      ) ?? [],
    );
    for (const fee of value.fees) {
      if ((fee.status === 'regional_director') !== incumbents.has(fee.userId))
        invalid('Director exemption and incumbent must agree');
    }
    for (const previous of value.directors?.previousFees ?? []) {
      const fee = value.fees.find((row) => row.userId === previous.userId);
      if (!fee || fee.validUntil !== previous.validUntil)
        invalid('Original director fee deadline must be preserved');
    }
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
