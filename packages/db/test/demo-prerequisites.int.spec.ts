import { describe, expect, it, vi } from 'vitest';
import type { DbTx } from '../src/client';
import { seedAffiliates } from '../seed/demo/affiliate';
import { seedDemoPricing } from '../seed/demo/pricing';

describe('demo reset matches current production prerequisites', () => {
  it('D94 includes unpaid members, preserves paid codes/bank and excludes investors/deleted users', async () => {
    const paidAt = new Date('2026-10-01T00:00:00Z');
    const rows = [
      { userId: 'm1', paidAt },
      { userId: 'm2', paidAt },
      { userId: 'm3', paidAt: null },
      { userId: 'm4', paidAt: null },
    ];
    const findMany = vi.fn().mockResolvedValue(rows);
    const createMany = vi.fn();
    const tx = {
      membershipFee: { findMany },
      affiliate: { createMany },
      affiliatePolicy: { upsert: vi.fn().mockResolvedValue({ defaultRate: 20 }) },
    } as unknown as DbTx;
    await seedAffiliates(tx);
    expect(findMany).toHaveBeenCalledExactlyOnceWith({
      where: { user: { deletedAt: null, accountType: { not: 'investor' } } },
      select: { userId: true, paidAt: true },
      orderBy: { userId: 'asc' },
    });
    const created = createMany.mock.calls[0]?.[0] as {
      data: { userId: string; code: string; status: string; bankNo?: string }[];
      skipDuplicates: boolean;
    };
    expect(created.skipDuplicates).toBe(true);
    expect(created.data.map(({ userId, code, status }) => ({ userId, code, status }))).toEqual([
      { userId: 'm1', code: 'OPCAN26', status: 'active' },
      { userId: 'm2', code: 'DEMOOPC11', status: 'active' },
      { userId: 'm3', code: 'DEMOOPC12', status: 'active' },
      { userId: 'm4', code: 'DEMOOPC13', status: 'active' },
    ]);
    expect(created.data[0]?.bankNo).toBe('0451000123456');
  });

  it('resets only demo tariff values; production seed remains separate', async () => {
    const update = vi.fn();
    await seedDemoPricing({ priceConfig: { update } } as unknown as DbTx);
    expect(update).toHaveBeenCalledExactlyOnceWith({
      where: { id: 1 },
      data: {
        perList: 200000,
        perYear: 1200000,
        bizList: 500000,
        bizYear: 3600000,
        fundPrice: 15000000,
        fundRenew: 7500000,
        fundMonths: 6,
      },
    });
  });
});
