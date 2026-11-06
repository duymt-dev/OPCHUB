import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { RegionalShareEventsHandler } from '@/modules/regional-director';
import { regionalShareFixture } from '../factories/regional-share.factory';
import { createTestApp, type TestApp } from '../setup/test-app';
import { createUser } from '../factories/user.factory';

describe('TIP-V46-802 regional share ledger', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());
  beforeEach(() =>
    t.prisma.db.affiliatePolicy.update({
      where: { id: 1 },
      data: { regionalFirstYear: 50, regionalStep: 10, regionalMin: 20 },
    }),
  );
  it.each([1, 2, 3, 4, 7])('year 1..4+ customer year %i', async (year) => {
    const f = await regionalShareFixture(t);
    await t.prisma.db.customerYear.create({
      data: {
        userId: f.customer.id,
        firstPaidAt: new Date(`${2027 - year}-10-02T00:00:00Z`),
        source: 'membership',
        sourceId: 'first',
      },
    });
    const id = await f.ledger.record(f.input);
    const row = await t.prisma.db.regionalShare.findUniqueOrThrow({ where: { id: id ?? '' } });
    expect(row.percent).toBe(Math.max(20, 50 - 10 * (year - 1)));
    expect(row.directorAmount + row.mediaSoftAmount).toBe(1_200_000);
    expect(row.directorUserId).toBe(f.director.id);
  });
  it('fundraising starts customer year', async () => {
    const f = await regionalShareFixture(t);
    await f.ledger.record({
      ...f.input,
      source: 'fundraising',
      plan: 'fundraising',
      at: new Date('2025-01-15'),
      sourceId: randomUUID(),
    });
    const id = await f.ledger.record({ ...f.input, at: new Date('2026-02-20') });
    expect(await t.prisma.db.regionalShare.findUnique({ where: { id: id ?? '' } })).toMatchObject({
      customerYear: 2,
      percent: 40,
    });
  });
  it('skips zero, non-referrals, self-referrals and rejected fundraising', async () => {
    const f = await regionalShareFixture(t);
    expect(await f.ledger.record({ ...f.input, baseAmount: 0 })).toBeNull();
    expect(
      await t.prisma.db.customerYear.findUnique({ where: { userId: f.customer.id } }),
    ).toBeNull();
    const other = await createUser(t);
    expect(await f.ledger.record({ ...f.input, customerId: other.id })).toBeNull();
    expect(
      await t.prisma.db.customerYear.findUnique({ where: { userId: other.id } }),
    ).not.toBeNull();
    await t.prisma.db.referral.update({
      where: { referredUserId: f.customer.id },
      data: { referredUserId: f.agent.id },
    });
    expect(await f.ledger.record({ ...f.input, customerId: f.agent.id })).toBeNull();
    await t.app.get(RegionalShareEventsHandler).fundraising({
      fundraisingId: 'rejected',
      projectId: 'p',
      projectName: 'P',
      ownerId: f.customer.id,
      amount: 100,
      decision: 'reject',
      reviewedAt: new Date().toISOString(),
    });
    expect(await t.prisma.db.regionalShare.count({ where: { sourceId: 'rejected' } })).toBe(0);
  });
  it('vacant and late appointment never reattributes old shares', async () => {
    const f = await regionalShareFixture(t, 'south');
    await t.prisma.db.regionalDirector.update({
      where: { region: 'south' },
      data: { userId: null, appointedAt: null },
    });
    const vacant = await f.ledger.record(f.input);
    await t.prisma.db.regionalDirector.update({
      where: { region: 'south' },
      data: { userId: f.director.id, appointedAt: new Date('2026-11-01') },
    });
    const late = await f.ledger.record({ ...f.input, sourceId: randomUUID() });
    const rows = await t.prisma.db.regionalShare.findMany({
      where: { id: { in: [vacant ?? '', late ?? ''] } },
    });
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.region === null && r.mediaSoftAmount === r.baseAmount)).toBe(true);
  });
  it('affiliate region earliest group; leaving changes only future receipts', async () => {
    const f = await regionalShareFixture(t, 'central');
    const north = await t.prisma.db.group.findFirstOrThrow({
      where: { kind: 'province', region: 'north' },
    });
    await t.prisma.db.groupMember.create({
      data: {
        groupId: north.id,
        userId: f.agent.id,
        status: 'member',
        createdAt: new Date('2020-01-05'),
      },
    });
    const first = await f.ledger.record(f.input);
    await t.prisma.db.groupMember.delete({
      where: { groupId_userId: { groupId: f.group.id, userId: f.agent.id } },
    });
    const second = await f.ledger.record({ ...f.input, sourceId: randomUUID() });
    expect(
      (await t.prisma.db.regionalShare.findUniqueOrThrow({ where: { id: first ?? '' } })).region,
    ).toBe('central');
    expect(
      (await t.prisma.db.regionalShare.findUniqueOrThrow({ where: { id: second ?? '' } })).region,
    ).toBe('north');
  });
  it('A7 industry child resolves parent region', async () => {
    const f = await regionalShareFixture(t, 'north');
    const south = await t.prisma.db.group.findFirstOrThrow({
      where: { kind: 'province', region: 'south', deletedAt: null },
      select: { province: true },
    });
    const child = await t.prisma.db.group.create({
      data: {
        slug: randomUUID(),
        name: 'A7 conflicting industry child',
        kind: 'industry',
        industry: randomUUID(),
        parentId: f.group.id,
        region: 'south',
        province: south.province,
      },
      select: { id: true },
    });
    try {
      await t.prisma.db.groupMember.deleteMany({ where: { userId: f.agent.id } });
      await t.prisma.db.groupMember.create({
        data: {
          groupId: child.id,
          userId: f.agent.id,
          status: 'member',
          createdAt: new Date('2020-01-01'),
        },
      });
      const id = await f.ledger.record(f.input);
      expect(
        await t.prisma.db.regionalShare.findUniqueOrThrow({ where: { id: id ?? '' } }),
      ).toMatchObject({
        region: 'north',
        directorUserId: f.director.id,
        directorAmount: 600_000,
      });
    } finally {
      await t.prisma.db.group.delete({ where: { id: child.id } });
    }
  });
  it('unticked province still receives the regional share', async () => {
    const f = await regionalShareFixture(t);
    await t.prisma.db.regionalDirectorProvince.deleteMany({ where: { region: 'north' } });
    const id = await f.ledger.record(f.input);
    expect(
      (await t.prisma.db.regionalShare.findUniqueOrThrow({ where: { id: id ?? '' } }))
        .directorUserId,
    ).toBe(f.director.id);
  });
  it('idempotent workers and membership event replay', async () => {
    const f = await regionalShareFixture(t);
    await Promise.all([f.ledger.record(f.input), f.ledger.record(f.input)]);
    expect(
      await t.prisma.db.regionalShare.count({
        where: { source: 'membership', sourceId: f.input.sourceId },
      }),
    ).toBe(1);
  });
  it('policy change not retroactive, including valid zero percent with an occupied region', async () => {
    const f = await regionalShareFixture(t);
    const first = await f.ledger.record(f.input);
    await t.prisma.db.affiliatePolicy.update({
      where: { id: 1 },
      data: { regionalFirstYear: 60, regionalStep: 15, regionalMin: 25 },
    });
    const second = await f.ledger.record({ ...f.input, sourceId: randomUUID() });
    expect(
      (await t.prisma.db.regionalShare.findUniqueOrThrow({ where: { id: first ?? '' } })).percent,
    ).toBe(50);
    expect(
      (await t.prisma.db.regionalShare.findUniqueOrThrow({ where: { id: second ?? '' } })).percent,
    ).toBe(60);
    await t.prisma.db.affiliatePolicy.update({
      where: { id: 1 },
      data: { regionalStep: 100, regionalMin: 0 },
    });
    const zero = await f.ledger.record({
      ...f.input,
      sourceId: randomUUID(),
      at: new Date('2028-10-02'),
    });
    expect(await t.prisma.db.regionalShare.findUnique({ where: { id: zero ?? '' } })).toMatchObject(
      { region: 'north', directorUserId: f.director.id, percent: 0 },
    );
  });
});
