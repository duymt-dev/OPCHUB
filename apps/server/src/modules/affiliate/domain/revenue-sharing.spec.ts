import { describe, expect, it } from 'vitest';
import {
  allocateRevenue,
  canSettleRevenueShare,
  customerYear,
  revenueAmounts,
  sharingRate,
} from './revenue-sharing';

const policy = { yearOneRate: 50, annualDecrease: 10, minimumRate: 20 };

describe('REQ-617 D-122 customer year', () => {
  const first = new Date('2024-10-31T03:45:00Z');
  it.each([
    ['2024-10-31T03:45:00Z', 1],
    ['2025-10-31T03:44:59.999Z', 1],
    ['2025-10-31T03:45:00Z', 2],
    ['2026-10-31T03:45:00Z', 3],
    ['2027-10-31T03:45:00Z', 4],
    ['2054-10-31T03:45:00Z', 31],
  ])('receipt %s has year %i for every plan type', (at, year) => {
    expect(customerYear(first, new Date(at))).toBe(year);
  });

  it('uses Vietnam calendar anniversary and clamps leap day, not 365 days', () => {
    const leap = new Date('2024-02-28T18:00:00Z'); // Feb 29, 01:00 VN
    expect(customerYear(leap, new Date('2025-02-27T17:59:59.999Z'))).toBe(1);
    expect(customerYear(leap, new Date('2025-02-27T18:00:00Z'))).toBe(2);
    expect(customerYear(leap, new Date('2028-02-28T18:00:00Z'))).toBe(5);
    expect(customerYear(leap, new Date('2028-02-28T17:59:59.999Z'))).toBe(4);
  });

  it('rejects invalid or reversed dates rather than silently inventing year one', () => {
    expect(() => customerYear(first, new Date('2024-01-01'))).toThrow(RangeError);
    expect(() => customerYear(new Date('bad'), first)).toThrow(RangeError);
    expect(() => customerYear(first, new Date('bad'))).toThrow(RangeError);
  });
});

describe('REQ-617 D-119/D-110 amount allocation', () => {
  it('uses policy for years 1/2/3/4+ with a perpetual minimum', () => {
    expect([1, 2, 3, 4, 5, 99].map((y) => sharingRate(y, policy))).toEqual([
      50, 40, 30, 20, 20, 20,
    ]);
    expect(sharingRate(2, { yearOneRate: 73, annualDecrease: 7, minimumRate: 12 })).toBe(66);
    expect(sharingRate(100, { yearOneRate: 73, annualDecrease: 0, minimumRate: 12 })).toBe(73);
  });

  it.each([0, -1, 1.5, NaN, Infinity])('rejects invalid customer year %s', (year) => {
    expect(() => sharingRate(year, policy)).toThrow(RangeError);
  });

  it('rounds to the nearest dong and conserves even the largest safe total', () => {
    expect(revenueAmounts(101, 50)).toEqual({ directorAmount: 51, mediaSoftAmount: 50 });
    expect(revenueAmounts(103, 20)).toEqual({ directorAmount: 21, mediaSoftAmount: 82 });
    for (const amount of [1, 101, 1_200_000, 3_600_000, 15_000_000, Number.MAX_SAFE_INTEGER]) {
      for (const rate of [0, 1, 20, 50, 73, 100]) {
        const r = revenueAmounts(amount, rate);
        expect(r.directorAmount + r.mediaSoftAmount).toBe(amount);
        expect(Number.isSafeInteger(r.directorAmount)).toBe(true);
        expect(r.mediaSoftAmount).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('D-121 vacancy/no eligible referrer allocates 100% to Media Soft', () => {
    const input = {
      amount: 101,
      firstReceivedAt: new Date('2025-01-01'),
      receivedAt: new Date('2026-01-01'),
      policy,
    };
    expect(allocateRevenue({ ...input, hasDirector: false })).toEqual({
      customerYear: 2,
      directorRate: 0,
      directorAmount: 0,
      mediaSoftAmount: 101,
    });
    expect(allocateRevenue({ ...input, hasDirector: true })).toEqual({
      customerYear: 2,
      directorRate: 40,
      directorAmount: 40,
      mediaSoftAmount: 61,
    });
  });

  it('rejects trial/zero, negative, fractional and unsafe receipts or invalid rates', () => {
    for (const amount of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() => revenueAmounts(amount, 50)).toThrow(RangeError);
    }
    for (const rate of [-1, 101, 50.5, NaN, Infinity]) {
      expect(() => revenueAmounts(100, rate)).toThrow(RangeError);
    }
  });

  it('allows only recorded to paid, preventing duplicate payout or reopening', () => {
    expect(canSettleRevenueShare('recorded', 'paid')).toBe(true);
    expect(canSettleRevenueShare('paid', 'paid')).toBe(false);
    expect(canSettleRevenueShare('paid', 'recorded')).toBe(false);
    expect(canSettleRevenueShare('recorded', 'recorded')).toBe(false);
  });
});
