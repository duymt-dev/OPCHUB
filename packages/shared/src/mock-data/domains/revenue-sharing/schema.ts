import { z } from 'zod';
import {
  revenueLedgerItemSchema,
  revenuePayoutSchema,
  revenueSharingPolicySchema,
} from '../../../api-domains';
import { revenueReceivedSchema } from '../../../outbox/revenue-sharing';

export const mockRevenueShareSchema = revenueLedgerItemSchema.extend({
  source: z.enum(['membership', 'fundraising']),
  sourceId: z.string().min(1),
  director: revenueReceivedSchema.shape.director,
  region: revenueReceivedSchema.shape.region,
  policy: revenueSharingPolicySchema,
});
export type MockRevenueShare = z.infer<typeof mockRevenueShareSchema>;
export const mockRevenueSnapshotSchema = z
  .strictObject({
    policy: revenueSharingPolicySchema,
    first: z.array(z.tuple([z.string().min(1), z.iso.datetime()])),
    pending: z.array(z.strictObject({ id: z.uuid(), payload: revenueReceivedSchema })),
    shares: z.array(mockRevenueShareSchema),
    payouts: z.array(z.strictObject({ key: z.string().min(1), receipt: revenuePayoutSchema })),
  })
  .superRefine((s, ctx) => {
    const invalid = (message: string) => ctx.addIssue({ code: 'custom', message });
    const unique = (keys: string[]) => new Set(keys).size === keys.length;
    if (!unique(s.first.map(([id]) => id))) invalid('Duplicate customer epoch');
    if (!unique(s.shares.map((r) => `${r.source}:${r.sourceId}`)))
      invalid('Duplicate receipt source');
    if (!unique(s.shares.map((r) => r.id))) invalid('Duplicate revenue share');
    if (!unique(s.pending.map((r) => `${r.payload.receipt.source}:${r.payload.receipt.sourceId}`)))
      invalid('Duplicate pending source');
    if (!unique(s.payouts.map((r) => r.key)) || !unique(s.payouts.map((r) => r.receipt.id)))
      invalid('Duplicate payout identity');
    const epochs = new Map(s.first);
    if (!unique(s.pending.map((r) => r.id))) invalid('Duplicate outbox identity');
    for (const { payload: p } of s.pending) {
      const first = epochs.get(p.receipt.customerId);
      if (!first || first > p.firstReceivedAt)
        invalid('Pending receipt must have a customer epoch');
    }
    const payouts = new Map(s.payouts.map((r) => [r.receipt.id, r.receipt]));
    for (const r of s.shares) {
      if (r.amount !== r.directorAmount + r.mediaSoftAmount)
        invalid('Allocation must conserve receipt');
      if (
        !epochs.has(r.customerId) ||
        (epochs.get(r.customerId) ?? '') > r.firstReceivedAt ||
        r.firstReceivedAt > r.receivedAt
      )
        invalid('Missing or invalid customer epoch');
      if (!r.director && (r.directorAmount || r.directorRate))
        invalid('Vacancy cannot earn a share');
      const p = r.payoutId ? payouts.get(r.payoutId) : undefined;
      if ((r.status === 'paid') !== Boolean(p) || (r.status === 'recorded' && r.payoutId !== null))
        invalid('Share and payout status disagree');
      if (p && (p.directorId !== r.director?.id || p.monthKey !== r.monthKey))
        invalid('Payout must belong to the earned beneficiary and month');
    }
    for (const { receipt: p } of s.payouts) {
      const rows = s.shares.filter((r) => r.payoutId === p.id);
      if (
        rows.length !== p.shareCount ||
        rows.reduce((n, r) => n + BigInt(r.directorAmount), 0n).toString() !== p.amount
      )
        invalid('Receipt total must match its immutable shares');
    }
  });
export type MockRevenueSnapshot = z.infer<typeof mockRevenueSnapshotSchema>;
