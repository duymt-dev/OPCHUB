import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Prisma } from '@opchub/db';
import { customerYearOf } from '@opchub/shared';
import { affiliateEarning } from '../factories/affiliate-admin.factory';
import { createAffiliateApp } from '../factories/affiliate.factory';
import type { TestApp } from '../setup/test-app';
const migration = readFileSync(
  new URL(
    '../../../../packages/db/prisma/migrations/20261106090000_v46_commission_customer_year/migration.sql',
    import.meta.url,
  ),
  'utf8',
);
const sql = Prisma.raw('UPDATE commissions' + migration.split('UPDATE commissions')[1]);
describe('D-131 customer year backfill', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createAffiliateApp();
  });
  afterAll(() => t.close());
  it('customer-year-backfill matches VN leap anniversary and is idempotent', async () => {
    const f = await affiliateEarning(t),
      first = new Date('2028-02-29T00:00:00Z'),
      at = new Date('2029-02-27T17:00:00Z');
    await t.prisma.db.customerYear.upsert({
      where: { userId: f.customer.id },
      create: {
        userId: f.customer.id,
        firstPaidAt: first,
        source: 'membership',
        sourceId: f.commission.id,
      },
      update: { firstPaidAt: first },
    });
    await t.prisma.db.commission.update({
      where: { id: f.commission.id },
      data: { createdAt: at },
    });
    await t.prisma.db.$executeRaw(sql);
    await t.prisma.db.$executeRaw(sql);
    expect(
      await t.prisma.db.commission.findUnique({ where: { id: f.commission.id } }),
    ).toMatchObject({ customerYear: customerYearOf(first, at) });
  });
  it('legacy rows without an anchor retain the default first year', async () => {
    const f = await affiliateEarning(t);
    await t.prisma.db.customerYear.deleteMany({ where: { userId: f.customer.id } });
    await t.prisma.db.$executeRaw(sql);
    expect(
      await t.prisma.db.commission.findUnique({ where: { id: f.commission.id } }),
    ).toMatchObject({ customerYear: 1 });
  });
});
