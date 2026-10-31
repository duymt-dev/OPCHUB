import {
  AFFILIATE_REVENUE_APPOINTED_AT,
  AFFILIATE_REVENUE_HISTORY_ID,
  affiliateRevenueCustomers,
  affiliateRevenueOwners,
  buildAffiliateRevenueDemo,
} from '../../../fixtures/revenue-affiliate-demo';
import { affiliateMockState } from '../affiliate';
import { REVENUE_POLICY_DEFAULTS } from '../../../fixtures/revenue-sharing';
import { mockDirectorState } from '../regional-directors/state';
import { mockDb } from '../store';
import { mockRevenueState } from './state';

/** Paired with the native explicit AF0 reset; not a runtime historical capture. */
export function seedMockAffiliateRevenueDemo(): void {
  const state = mockRevenueState();
  const demo = buildAffiliateRevenueDemo();
  if (state.shares.some((r) => r.id === demo.shares[0]?.id)) return;
  assertMockAffiliateRevenueSeedable();
  const directors = mockDirectorState();
  const north = directors.config.slots.find((r) => r.region === 'north');
  if (north?.incumbent?.id !== 'm3' || directors.config.slots.some((s) => s.version !== 1))
    throw new Error('Missing original AF0 director');
  seedPeople();
  north.incumbent.appointedAt = AFFILIATE_REVENUE_APPOINTED_AT;
  directors.history.push({
    id: AFFILIATE_REVENUE_HISTORY_ID,
    region: 'north',
    action: 'appointed',
    memberName: north.incumbent.fullName,
    actorName: 'Super Admin',
    actorRole: 'Super Admin',
    at: AFFILIATE_REVENUE_APPOINTED_AT,
    summary: `Bổ nhiệm GĐ Vùng Miền Bắc · ${north.incumbent.fullName}`,
  });
  for (const slot of directors.config.slots) {
    if (slot.incumbent)
      directors.recipientBanks.push({ directorId: slot.incumbent.id, bank: slot.bank });
  }
  const first = new Map(state.first);
  for (const p of [...affiliateRevenueCustomers, ...affiliateRevenueOwners]) {
    const old = first.get(p.userId);
    first.set(p.userId, old && old < p.firstReceivedAt ? old : p.firstReceivedAt);
  }
  state.first = [...first];
  state.policy = { ...REVENUE_POLICY_DEFAULTS };
  state.shares.push(...demo.shares);
  state.payouts.push(
    ...demo.payouts.map((receipt) => ({ key: `demo-af0-${receipt.id}`, receipt })),
  );
}

/** Run before AF0 adds accounts, so existing financial activity cannot be partially reseeded. */
export function assertMockAffiliateRevenueSeedable(): void {
  const state = mockRevenueState();
  const ids = new Set(
    [...affiliateRevenueCustomers, ...affiliateRevenueOwners].map((c) => c.userId),
  );
  if (
    state.shares.some((r) => ids.has(r.customerId)) ||
    state.pending.some((r) => ids.has(r.payload.receipt.customerId))
  )
    throw new Error('Seed AF0 before recording revenue');
}

function seedPeople(): void {
  const db = mockDb();
  const affiliate = affiliateMockState();
  const people = [...affiliateRevenueCustomers, ...affiliateRevenueOwners].map((p) => {
    const fee = db.fees.find((f) => f.userId === p.userId);
    if (!fee) throw new Error('Seed AF0 accounts before revenue');
    return { fee, registeredAt: p.registeredAt };
  });
  const north = db.fees.find((f) => f.userId === 'm3');
  if (!north) throw new Error('Missing north account');
  const memberships = affiliateRevenueOwners.map((owner) => {
    const group = db.groups.find((g) => g.kind === 'province' && g.province === owner.province);
    if (!group) throw new Error('Missing AF0 province group');
    return { owner, group };
  });
  if (affiliateRevenueCustomers.some((c) => !affiliate.referrals.has(c.userId)))
    throw new Error('Missing AF0 referral');
  for (const p of people) p.fee.joinedAt = p.registeredAt;
  north.joinedAt = new Date(Date.parse(AFFILIATE_REVENUE_APPOINTED_AT) - 86400000).toISOString();
  for (const { owner, group } of memberships) {
    const prior =
      db.groupMembers.get(owner.userId) ?? new Map<string, 'member' | 'left' | 'removed'>();
    if (prior.get(group.id) !== 'member') group.memberCount++;
    // Native directory orders by membership time. Map insertion order is the MSW equivalent.
    db.groupMembers.set(
      owner.userId,
      new Map([[group.id, 'member'], ...[...prior].filter(([id]) => id !== group.id)]),
    );
  }
  // Displayed commission dates remain actual renewals, not first acquisition dates.
}
