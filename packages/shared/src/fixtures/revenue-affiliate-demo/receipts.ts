import type { RevenueSharingPolicy } from '../../api-domains/revenue-sharing';
import type { RevenuePayoutReceipt } from '../../api-domains/revenue-payouts';
import { allocateRevenue } from '../../revenue-sharing/math';
import { planAmountOf } from '../../membership/pricing';
import { DIRECTOR_DEMO } from '../regional-directors';
import { PRICE_DEFAULTS } from '../price-defaults';
import { REVENUE_POLICY_DEFAULTS } from '../revenue-sharing';
import { affiliateRevenueCustomers, affiliateRevenueOwners } from './chronology';

/** Historical snapshot recipe only. Runtime capture/settlement never calls this module. */
export function buildAffiliateRevenueShares(
  policy: RevenueSharingPolicy = REVENUE_POLICY_DEFAULTS,
) {
  return affiliateRevenueCustomers.map((customer) => {
    const owner = affiliateRevenueOwners.find((a) => a.id === customer.affiliateId);
    if (!owner) throw new Error('Missing AF0 affiliate');
    // AF0's cancelled row is an invalid referral, not a lost actual bank receipt.
    const referred = customer.status !== 'cancelled';
    const region = owner.province === 'Đà Nẵng' ? 'central' : 'north';
    const director = DIRECTOR_DEMO.find((d) => d.region === region);
    if (!director) throw new Error('Missing AF0 director');
    const amount = planAmountOf(PRICE_DEFAULTS, customer.plan);
    const pending: { status: 'recorded' | 'paid'; payoutId: string | null } = {
      status: 'recorded',
      payoutId: null,
    };
    return {
      id: customer.shareId,
      source: 'membership' as const,
      sourceId: customer.sourceId,
      customerId: customer.userId,
      customerName: customer.name,
      affiliateId: referred ? owner.userId : null,
      affiliateName: referred ? owner.name : null,
      region: referred ? director.region : null,
      director: referred
        ? { id: director.userId, name: director.name, bank: { ...director.bank } }
        : null,
      plan: customer.plan,
      amount,
      receivedAt: customer.paidAt,
      recordedAt: customer.paidAt,
      firstReceivedAt: customer.firstReceivedAt,
      monthKey: customer.month,
      policy: { ...policy },
      ...allocateRevenue({
        amount,
        firstReceivedAt: new Date(customer.firstReceivedAt),
        receivedAt: new Date(customer.paidAt),
        policy,
        hasDirector: referred,
      }),
      ...pending,
    };
  });
}

type Shares = ReturnType<typeof buildAffiliateRevenueShares>;

/** Closed August/September periods, paid at the first eligible instant in VN time. */
export function buildAffiliateRevenueHistory(shares: Shares): RevenuePayoutReceipt[] {
  const groups = new Map<string, Shares>();
  for (const row of shares) {
    if (!row.director || row.monthKey >= '2026-10') continue;
    const key = `${row.director.id}|${row.monthKey}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, rows], index) => {
      const first = rows[0];
      if (!first?.director || !first.region) throw new Error('Missing payout beneficiary');
      const [year, month] = first.monthKey.split('-').map(Number);
      if (!year || !month) throw new Error('Invalid fixture month');
      const id = `62810000-0000-4000-8002-${String(index + 1).padStart(12, '0')}`;
      for (const row of rows) {
        row.status = 'paid';
        row.payoutId = id;
      }
      return {
        id,
        directorId: first.director.id,
        directorName: first.director.name,
        region: first.region,
        monthKey: first.monthKey,
        amount: rows.reduce((sum, row) => sum + BigInt(row.directorAmount), 0n).toString(),
        shareCount: rows.length,
        bank: { ...first.director.bank },
        paidBy: 'admin',
        paidAt: new Date(Date.UTC(year, month, 1, -7)).toISOString(),
      };
    });
}

export function buildAffiliateRevenueDemo(policy: RevenueSharingPolicy = REVENUE_POLICY_DEFAULTS) {
  const shares = buildAffiliateRevenueShares(policy);
  return { shares, payouts: buildAffiliateRevenueHistory(shares) };
}
