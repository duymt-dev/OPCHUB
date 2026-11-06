import { z } from 'zod';
import type { GroupMemberStatus } from '../../enums';
import {
  regionalShareItemSchema,
  regionalRegionSchema,
  regionalPayoutResultSchema,
  regionalBankSchema,
} from '../../api-domains';
import { affiliateDemoCustomers, communities } from '../../fixtures';
import { planAmountOf } from '../../membership/pricing';
import { mockDb, type MockDb } from './store';
import { affiliateMockState } from './affiliate';
import { mockRegionalDirectors } from './regional-directors';
import {
  REGIONAL_DEMO_AFFILIATES,
  buildRegionalShareDemo,
  type RegionalDemoSource,
} from './regional-share-demo';
import { readMockAffiliatePolicy } from './affiliate-policy';
import { readMockPrices } from './price-config';
import { regionalMockBanks } from './regional-share-bank';

export const regionalMockShareSchema = regionalShareItemSchema.extend({
  source: z.enum(['membership', 'fundraising']),
  sourceId: z.string(),
  customerId: z.string(),
  affiliateId: z.string(),
  affiliateUserId: z.string(),
  region: regionalRegionSchema.nullable(),
  directorUserId: z.string().nullable(),
  mediaSoftAmount: z.number().int(),
});
export const regionalShareSnapshotSchema = z.object({
  seeded: z.boolean(),
  rows: z.array(regionalMockShareSchema),
  firstPaid: z.array(z.tuple([z.string(), z.iso.datetime()])),
  receipts: z.array(
    z.tuple([
      z.string(),
      regionalPayoutResultSchema.extend({ region: regionalRegionSchema, paidAt: z.string() }),
    ]),
  ),
  banks: z.array(z.tuple([z.string(), regionalBankSchema])),
});
export type MockRegionalShare = z.infer<typeof regionalMockShareSchema>;
type State = {
  seeded: boolean;
  rows: MockRegionalShare[];
  firstPaid: Map<string, string>;
  receipts: Map<string, z.infer<typeof regionalShareSnapshotSchema>['receipts'][number][1]>;
};
const states = new WeakMap<MockDb, State>();
export function regionalShareState(): State {
  const db = mockDb();
  let s = states.get(db);
  if (!s) {
    s = { seeded: false, rows: [], firstPaid: new Map(), receipts: new Map() };
    states.set(db, s);
  }
  if (!s.seeded && db.fees.some((f) => f.userId.startsWith('af-customer-'))) seed(s);
  return s;
}
function seed(s: State) {
  const slots = mockRegionalDirectors(false).items;
  for (const a of REGIONAL_DEMO_AFFILIATES) {
    const g = communities.find((g) => g.province === a.province);
    if (g) {
      const mine = mockDb().groupMembers.get(a.userId) ?? new Map<string, GroupMemberStatus>();
      mine.set(g.id, 'member');
      mockDb().groupMembers.set(a.userId, mine);
    }
  }
  const inputs = affiliateDemoCustomers
    .filter((c) => c.status !== 'cancelled')
    .flatMap((c): RegionalDemoSource[] => {
      const agent = REGIONAL_DEMO_AFFILIATES.find((a) => a.affiliateId === c.affiliateId);
      const slot = slots.find((r) => r.region === agent?.region);
      return agent && slot?.member
        ? [
            {
              source: 'membership',
              sourceId: `demo-fee-${c.userId}`,
              customerId: c.userId,
              affiliateId: c.affiliateId,
              affiliateUserId: agent.userId,
              region: agent.region,
              directorUserId: slot.member.id,
              baseAmount: planAmountOf(readMockPrices(), c.plan),
              plan: c.plan,
            },
          ]
        : [];
    })
    .sort((a, b) => a.sourceId.localeCompare(b.sourceId));
  const generated = buildRegionalShareDemo(inputs, readMockAffiliatePolicy(), new Date());
  s.rows = generated.map((r) => ({
    id: r.id,
    source: r.source,
    sourceId: r.sourceId,
    customerId: r.customerId,
    affiliateId: r.affiliateId,
    affiliateUserId: r.affiliateUserId,
    region: r.region,
    directorUserId: r.directorUserId,
    plan: r.plan,
    baseAmount: r.baseAmount,
    customerYear: r.customerYear,
    percent: r.percent,
    directorAmount: r.directorAmount,
    mediaSoftAmount: r.mediaSoftAmount,
    recordedAt: r.recordedAt.toISOString(),
    status: r.paid ? 'paid' : 'pending',
    customerName:
      affiliateDemoCustomers.find((c) => c.userId === r.customerId)?.name ?? r.customerId,
    affiliateName: affiliateMockState().agents.get(r.affiliateUserId)?.name ?? r.affiliateUserId,
  }));
  generated.forEach((r) => s.firstPaid.set(r.customerId, r.firstPaidAt.toISOString()));
  const paid = generated.find((r) => r.paid);
  const slot = slots.find((r) => r.region === paid?.region);
  if (paid && slot?.member)
    s.receipts.set('regional-demo-payout', {
      id: 'regional-demo-payout',
      region: paid.region,
      paidAt: new Date().toISOString(),
      amount: paid.directorAmount,
      count: 1,
      monthKeys: [paid.monthKey],
      directorUserId: paid.directorUserId,
      directorName: slot.member.fullName,
      bankHolder: slot.bank.bankHolder,
    });
  s.seeded = true;
}
export function captureRegionalShareState() {
  const s = regionalShareState();
  return regionalShareSnapshotSchema.parse({
    seeded: s.seeded,
    rows: s.rows,
    firstPaid: [...s.firstPaid],
    receipts: [...s.receipts],
    banks: [...regionalMockBanks()],
  });
}
export function restoreRegionalShareState(
  input: z.infer<typeof regionalShareSnapshotSchema> | undefined,
) {
  if (!input) return;
  const data = regionalShareSnapshotSchema.parse(input);
  states.set(mockDb(), {
    seeded: data.seeded,
    rows: data.rows,
    firstPaid: new Map(data.firstPaid),
    receipts: new Map(data.receipts),
  });
  const banks = regionalMockBanks();
  banks.clear();
  data.banks.forEach(([k, v]) => banks.set(k, v));
}
