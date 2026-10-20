import { describe, expect, it } from 'vitest';
import { affiliateSummarySchema } from './affiliate-admin';

describe('REQ-312 Affiliate summary paid contract', () => {
  const base = { revenue: 600000, totalCommission: 120000, payable: 0, netRevenue: 480000 };
  it('requires server-owned paid instead of silently defaulting an older response to zero', () => {
    expect(affiliateSummarySchema.safeParse(base).success).toBe(false);
    expect(affiliateSummarySchema.parse({ ...base, paid: 120000 }).paid).toBe(120000);
  });
  it('allows empty totals but rejects fractional or negative VND', () => {
    expect(affiliateSummarySchema.safeParse({ ...base, paid: 0 }).success).toBe(true);
    expect(affiliateSummarySchema.safeParse({ ...base, paid: -1 }).success).toBe(false);
    expect(affiliateSummarySchema.safeParse({ ...base, paid: 0.5 }).success).toBe(false);
  });
});
