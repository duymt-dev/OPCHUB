import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { parseOutboxPayload } from '@opchub/shared/outbox';
import { AffiliateLifecycleHandler, FundraisingCommissionHandler } from '@/modules/affiliate';
import { createUser } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

describe('A9 BR-463 D-131 commission guards', () => {
  let t: TestApp;
  let originalFundraisingRate: number;
  const users: string[] = [];

  beforeAll(async () => {
    t = await createTestApp();
    originalFundraisingRate = (
      await t.prisma.db.affiliatePolicy.findUniqueOrThrow({
        where: { id: 1 },
        select: { fundraisingRate: true },
      })
    ).fundraisingRate;
  });
  afterEach(async () => {
    const ids = users.splice(0);
    await t.prisma.db.customerYear.deleteMany({ where: { userId: { in: ids } } });
    await t.prisma.db.user.deleteMany({ where: { id: { in: ids } } });
    await t.prisma.db.affiliatePolicy.update({
      where: { id: 1 },
      data: { fundraisingRate: originalFundraisingRate },
    });
  });
  afterAll(() => t.close());

  async function affiliate(rate: number) {
    const user = await createUser(t, { fee: 'active' });
    users.push(user.id);
    const row = await t.prisma.db.affiliate.create({
      data: {
        userId: user.id,
        rate,
        code: `A9${randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase()}`,
      },
    });
    return { user, row };
  }

  async function guarded(source: 'membership' | 'fundraising', self: boolean) {
    const agent = await affiliate(self ? 20 : 1);
    const customer = self ? agent : await affiliate(20);
    await t.prisma.db.referral.create({
      data: {
        affiliateId: agent.row.id,
        affiliateCode: agent.row.code,
        referredUserId: customer.user.id,
        monthKey: '2026-11',
      },
    });
    const before = await t.prisma.db.outboxEvent.count({
      where: { type: 'affiliate.commission_recorded' },
    });
    const id = randomUUID();
    const at = '2026-11-06T02:00:00Z';
    const amount = self ? 1_200_000 : 1;
    if (source === 'membership') {
      await t.app.get(AffiliateLifecycleHandler).onFeeConfirmed(
        parseOutboxPayload('membership_fee.confirmed', {
          userId: customer.user.id,
          periodId: id,
          listAmount: amount,
          plan: 'personal',
          confirmedAt: at,
          isFirst: true,
        }),
      );
    } else {
      await t.prisma.db.affiliatePolicy.update({ where: { id: 1 }, data: { fundraisingRate: 1 } });
      await t.app.get(FundraisingCommissionHandler).onReviewed(
        parseOutboxPayload('fundraising.reviewed', {
          fundraisingId: id,
          projectId: randomUUID(),
          projectName: 'A9 guard',
          ownerId: customer.user.id,
          amount,
          decision: 'approve',
          reviewedAt: at,
        }),
      );
    }
    expect(
      await t.prisma.db.commission.count({ where: { referredUserId: customer.user.id } }),
    ).toBe(0);
    expect(
      await t.prisma.db.outboxEvent.count({ where: { type: 'affiliate.commission_recorded' } }),
    ).toBe(before);
  }

  it.each(['membership', 'fundraising'] as const)('A9 self referral no commission (%s)', (source) =>
    guarded(source, true),
  );
  it.each(['membership', 'fundraising'] as const)('A9 rounded zero no commission (%s)', (source) =>
    guarded(source, false),
  );
});
