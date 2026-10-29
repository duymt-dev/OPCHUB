import { describe, expect, it } from 'vitest';
import {
  affiliateDemoAgents,
  affiliateDemoCustomers,
  affiliateDemoPaidAt,
  affiliateDemoStartedAt,
} from './affiliate';

describe('Affiliate AF0 fixture', () => {
  it('REQ-311 six owners, 51 separate customers including HAOPC and one cancellation', () => {
    expect(affiliateDemoAgents).toHaveLength(6);
    expect(affiliateDemoAgents.find((a) => a.code === 'HAOPC')).toMatchObject({
      name: 'Lê Thu Hà',
      rate: 25,
    });
    expect(affiliateDemoCustomers).toHaveLength(51);
    expect(new Set(affiliateDemoCustomers.map((c) => c.userId)).size).toBe(51);
    expect(affiliateDemoCustomers.filter((c) => c.status === 'cancelled')).toHaveLength(1);
    for (const a of affiliateDemoAgents) {
      const refs = affiliateDemoCustomers.filter((c) => c.affiliateId === a.id);
      expect(refs.every((c) => c.userId !== a.userId)).toBe(true);
      expect(refs.every((c) => c.paidAt > affiliateDemoStartedAt(a.id))).toBe(true);
    }
  });
  it('D-110 plan split like prototype v4.2: 17 business, 33 personal valid commissions', () => {
    const valid = affiliateDemoCustomers.filter((c) => c.status !== 'cancelled');
    expect(valid.filter((c) => c.plan === 'business')).toHaveLength(17);
    expect(valid.filter((c) => c.plan === 'personal')).toHaveLength(33);
    expect(affiliateDemoCustomers.find((c) => c.id === 'c1')?.plan).toBe('business');
  });
  it('REQ-311 m1 has 412 clicks, 9 customers, 3 this month and 6 paid in two periods', () => {
    expect(affiliateDemoAgents[0]?.clicks).toBe(412);
    const refs = affiliateDemoCustomers.filter((c) => c.affiliateId === 'a1');
    expect(refs).toHaveLength(9);
    expect(refs.filter((c) => c.month === '2026-10')).toHaveLength(3);
    expect(refs.filter((c) => c.status === 'paid')).toHaveLength(6);
    expect(new Set(refs.filter((c) => c.status === 'paid').map((c) => c.month)).size).toBe(2);
    expect(affiliateDemoPaidAt('2026-08')).toBe('2026-08-30T17:00:00.000Z');
    expect(affiliateDemoPaidAt('2026-09')).toBe('2026-09-29T17:00:00.000Z');
  });
});
