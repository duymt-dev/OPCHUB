import { describe, expect, it } from 'vitest';
import { revenuePayoutSchema } from '../../api-domains/revenue-payouts';
import { mockRevenueSnapshotSchema } from '../../mock-data/domains/revenue-sharing/schema';
import { DIRECTOR_DEMO } from '../regional-directors';
import { REVENUE_POLICY_DEFAULTS } from '../revenue-sharing';
import {
  AFFILIATE_REVENUE_APPOINTED_AT,
  affiliateRevenueCustomers,
  affiliateRevenueOwners,
} from './chronology';
import { buildAffiliateRevenueDemo } from './receipts';

describe('REQ-617 D-119 coherent AF0 sharing fixture', () => {
  it('derives the reference allocation from actual receipt chronology, not KPI constants', () => {
    const { shares, payouts } = buildAffiliateRevenueDemo();
    expect(shares).toHaveLength(51);
    const attributed = shares.filter((r) => r.affiliateId);
    expect(attributed).toHaveLength(50);
    expect(new Set(attributed.map((r) => r.affiliateId)).size).toBe(6);
    expect(attributed.reduce((s, r) => s + r.amount, 0)).toBe(100800000);
    expect(attributed.reduce((s, r) => s + r.directorAmount, 0)).toBe(44880000);
    expect(attributed.reduce((s, r) => s + r.mediaSoftAmount, 0)).toBe(55920000);
    expect(
      attributed.filter((r) => r.status === 'recorded').reduce((s, r) => s + r.directorAmount, 0),
    ).toBe(16200000);
    expect(payouts.map((p) => [p.monthKey, p.amount])).toEqual([
      ['2026-08', '7800000'],
      ['2026-09', '20880000'],
    ]);
    expect(new Set(shares.map((r) => r.customerYear))).toEqual(new Set([1, 2, 3, 4]));
    for (const row of shares) expect(row.amount).toBe(row.directorAmount + row.mediaSoftAmount);
  });
  it('has registration, first receipt and appointment before their dependent events', () => {
    const demo = buildAffiliateRevenueDemo();
    for (const row of demo.shares) {
      const c = affiliateRevenueCustomers.find((c) => c.userId === row.customerId)!;
      const a = affiliateRevenueOwners.find((a) => a.id === c.affiliateId)!;
      expect(a.registeredAt < a.firstReceivedAt).toBe(true);
      expect(a.firstReceivedAt < c.registeredAt).toBe(true);
      expect(c.registeredAt < c.firstReceivedAt).toBe(true);
      expect(c.firstReceivedAt <= c.paidAt).toBe(true);
      if (row.director) {
        const appointedAt =
          row.region === 'north'
            ? AFFILIATE_REVENUE_APPOINTED_AT
            : DIRECTOR_DEMO.find((d) => d.userId === row.director?.id)!.appointedAt;
        expect(appointedAt <= row.receivedAt).toBe(true);
      }
    }
    for (const payout of demo.payouts) {
      expect(revenuePayoutSchema.safeParse(payout).success).toBe(true);
      expect(new Date(Date.parse(payout.paidAt) + 7 * 3600000).toISOString().slice(0, 7)).not.toBe(
        payout.monthKey,
      );
    }
  });
  it('keeps invalid referral money wholly at Media Soft and validates persisted snapshot invariants', () => {
    const { shares, payouts } = buildAffiliateRevenueDemo();
    expect(shares.filter((r) => !r.affiliateId)).toMatchObject([
      {
        customerId: 'af-customer-c18',
        amount: 1200000,
        directorAmount: 0,
        mediaSoftAmount: 1200000,
      },
    ]);
    expect(
      mockRevenueSnapshotSchema.safeParse({
        policy: REVENUE_POLICY_DEFAULTS,
        first: affiliateRevenueCustomers.map((c) => [c.userId, c.firstReceivedAt]),
        pending: [],
        shares,
        payouts: payouts.map((receipt) => ({ key: receipt.id, receipt })),
      }).success,
    ).toBe(true);
  });
  it('recomputes amounts from a different supplied policy and remains deterministic', () => {
    const changed = buildAffiliateRevenueDemo({
      yearOneRate: 60,
      annualDecrease: 10,
      minimumRate: 20,
    });
    expect(changed.shares[0]?.directorAmount).not.toBe(
      buildAffiliateRevenueDemo().shares[0]?.directorAmount,
    );
    expect(buildAffiliateRevenueDemo()).toEqual(buildAffiliateRevenueDemo());
  });
});
