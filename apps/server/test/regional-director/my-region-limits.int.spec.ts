import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { RegionalPayoutService } from '@/modules/regional-director';
import { MyRegionService } from '@/modules/regional-director/services/my-region.service';
import { regionalShareFixture } from '../factories/regional-share.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

describe('TIP-V46-804 regional aggregation limits', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());
  beforeEach(async () => {
    await t.prisma.db.regionalDirector.updateMany({ data: { userId: null, appointedAt: null } });
    await t.prisma.db.affiliatePolicy.update({
      where: { id: 1 },
      data: { regionalFirstYear: 50, regionalStep: 10, regionalMin: 20 },
    });
  });
  it('mixed share month stays pending, paidAt comes from exact payout, distinct paid months', async () => {
    const f = await regionalShareFixture(t);
    await f.ledger.record(f.input);
    await t.app
      .get(RegionalPayoutService)
      .record(f.who, f.region, f.director.id, randomUUID(), new Date('2026-11-04'));
    await f.ledger.record({ ...f.input, sourceId: randomUUID() });
    const data = await t.app.get(MyRegionService).read(f.director.id);
    if (data.state !== 'director') throw new Error('Missing director');
    expect(data.kpi).toMatchObject({
      count: 2,
      share: 1200000,
      paid: 600000,
      due: 600000,
      paidMonths: 1,
    });
    expect(data.months).toEqual([
      {
        monthKey: '2026-10',
        amount: 1200000,
        status: 'pending',
        paidAt: '2026-11-04T00:00:00.000Z',
      },
    ]);
  });
  it('retains the financial group when the affiliate account has been deleted', async () => {
    const f = await regionalShareFixture(t);
    await f.ledger.record(f.input);
    await t.prisma.db.user.delete({ where: { id: f.agent.id } });
    const data = await t.app.get(MyRegionService).read(f.director.id);
    if (data.state !== 'director') throw new Error('Missing director');
    expect(data.kpi).toMatchObject({ count: 1, share: 600000 });
    expect(data.affiliates).toEqual([
      {
        id: f.affiliate.id,
        name: 'Thành viên đã xóa',
        code: '',
        customers: 1,
        revenue: 1200000,
        share: 600000,
      },
    ]);
  });
  it('60 affiliate groups are capped at 50 with exact more and monthly history at 24', async () => {
    const f = await regionalShareFixture(t);
    const id = await f.ledger.record(f.input);
    const row = await t.prisma.db.regionalShare.findUniqueOrThrow({ where: { id: id ?? '' } });
    const prefix = randomUUID();
    const people = Array.from({ length: 60 }, (_, i) => ({
      id: `${prefix}-${i}`,
      memberCode: `${prefix}-${i}`,
      fullName: `Agent ${String(i).padStart(2, '0')}`,
      email: `${prefix}-${i}@test.opchub.vn`,
      accountType: 'personal' as const,
      updatedAt: new Date(),
    }));
    await t.prisma.db.user.createMany({ data: people });
    await t.prisma.db.affiliate.createMany({
      data: people.map((p, i) => ({
        id: p.id,
        userId: p.id,
        code: `X${prefix.replaceAll('-', '').slice(0, 7).toUpperCase()}${i}`,
        rate: 20,
      })),
    });
    await t.prisma.db.regionalShare.createMany({
      data: people.map((p, i) => ({
        ...row,
        id: randomUUID(),
        sourceId: randomUUID(),
        affiliateId: p.id,
        affiliateUserId: p.id,
        monthKey: `${2020 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`,
      })),
    });
    const data = await t.app.get(MyRegionService).read(f.director.id);
    if (data.state !== 'director') throw new Error('Missing director');
    expect(data.affiliates).toHaveLength(50);
    expect(data.more).toBe(11);
    expect(data.months).toHaveLength(24);
    expect(data.months[0]?.monthKey).toBe('2026-10');
  });
});
