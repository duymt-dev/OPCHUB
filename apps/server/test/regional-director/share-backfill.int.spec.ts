import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Prisma } from '@opchub/db';
import { createTestApp, type TestApp } from '../setup/test-app';
import { createUser } from '../factories/user.factory';
const sql = readFileSync(
  new URL(
    '../../../../packages/db/prisma/migrations/20261105090000_v46_regional_share/migration.sql',
    import.meta.url,
  ),
  'utf8',
);
const backfill = Prisma.raw(sql.slice(sql.indexOf('INSERT INTO customer_years(')));
describe('TIP-V46-802 customer year backfill', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());
  it('minimum across paid sources, excludes zero and legacy, repeats safely', async () => {
    const user = await createUser(t);
    const project = await t.prisma.db.project.create({
      data: { ownerId: user.id, name: 'Backfill test' },
    });
    await t.prisma.db.membershipFeePeriod.createMany({
      data: [
        {
          userId: user.id,
          startsAt: new Date('2026-02-20'),
          endsAt: new Date('2027-02-20'),
          amount: 100,
          source: 'manual',
          reason: 'Backfill fixture',
          createdAt: new Date('2026-02-20'),
        },
        {
          userId: user.id,
          startsAt: new Date('2024-01-01'),
          endsAt: new Date('2025-01-01'),
          amount: 0,
          source: 'manual',
          reason: 'Zero fixture',
          createdAt: new Date('2024-01-01'),
        },
      ],
    });
    await t.prisma.db.projectFundraising.createMany({
      data: [
        {
          ownerId: user.id,
          projectId: project.id,
          amount: 200,
          legacy: false,
          status: 'pending_review',
          paidAt: new Date('2026-01-15'),
        },
        {
          ownerId: user.id,
          projectId: project.id,
          amount: 300,
          legacy: true,
          status: 'expired',
          startsAt: new Date('2023-01-01'),
          endsAt: new Date('2024-01-01'),
          paidAt: new Date('2023-01-01'),
        },
        {
          ownerId: user.id,
          projectId: project.id,
          amount: 0,
          legacy: false,
          status: 'expired',
          startsAt: new Date('2022-01-01'),
          endsAt: new Date('2023-01-01'),
          paidAt: new Date('2022-01-01'),
        },
      ],
    });
    await t.prisma.db.$executeRaw(backfill);
    const first = await t.prisma.db.customerYear.findUniqueOrThrow({ where: { userId: user.id } });
    expect(first.firstPaidAt.toISOString()).toBe('2026-01-15T00:00:00.000Z');
    expect(first.source).toBe('fundraising');
    await t.prisma.db.$executeRaw(backfill);
    expect(await t.prisma.db.customerYear.findUnique({ where: { userId: user.id } })).toEqual(
      first,
    );
    expect(await t.prisma.db.regionalShare.count({ where: { customerId: user.id } })).toBe(0);
  });
  it('membership wins ties and an earlier backfill may move an existing anchor', async () => {
    const user = await createUser(t);
    const project = await t.prisma.db.project.create({
      data: { ownerId: user.id, name: 'Tie test' },
    });
    const at = new Date('2025-01-15');
    await t.prisma.db.customerYear.create({
      data: {
        userId: user.id,
        firstPaidAt: new Date('2026-01-15'),
        source: 'fundraising',
        sourceId: 'late',
      },
    });
    await t.prisma.db.membershipFeePeriod.create({
      data: {
        userId: user.id,
        startsAt: at,
        endsAt: new Date('2026-01-15'),
        amount: 100,
        source: 'manual',
        reason: 'Tie fixture',
        createdAt: at,
      },
    });
    await t.prisma.db.projectFundraising.create({
      data: {
        ownerId: user.id,
        projectId: project.id,
        amount: 200,
        legacy: false,
        status: 'pending_review',
        paidAt: at,
      },
    });
    await t.prisma.db.$executeRaw(backfill);
    expect(await t.prisma.db.customerYear.findUnique({ where: { userId: user.id } })).toMatchObject(
      { firstPaidAt: at, source: 'membership' },
    );
  });
});
