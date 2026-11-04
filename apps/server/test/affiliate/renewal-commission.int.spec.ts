import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AffiliateLifecycleHandler } from '@/modules/affiliate';
import { RegionalShareEventsHandler } from '@/modules/regional-director';
import {
  createAffiliate,
  createAffiliateApp,
  createReferral,
  confirmFee,
} from '../factories/affiliate.factory';
import type { TestApp } from '../setup/test-app';
import { FundraisingCommissionHandler } from '@/modules/affiliate';
import { CommissionAdminService } from '@/modules/affiliate/services/commission-admin.service';
import { createProject } from '../factories/project.factory';
import { tokenOf } from '../factories/group.factory';
import { createUser } from '../factories/user.factory';

describe('D-131 renewal commissions', () => {
  let t: TestApp;
  let original: { renewalRate: number; renewalMaxYear: number };
  beforeAll(async () => {
    t = await createAffiliateApp();
    original = await t.prisma.db.affiliatePolicy.findUniqueOrThrow({
      where: { id: 1 },
      select: { renewalRate: true, renewalMaxYear: true },
    });
  });
  afterAll(async () => {
    await t.prisma.db.affiliatePolicy.update({ where: { id: 1 }, data: original });
    await t.close();
  });
  beforeEach(() =>
    t.prisma.db.affiliatePolicy.update({
      where: { id: 1 },
      data: { renewalRate: 10, renewalMaxYear: 3 },
    }),
  );
  it('D-131 fundraising uses customer year rather than the first-year fundraising rate', async () => {
    const { affiliate } = await createAffiliate(t, new Date('2025-01-01'));
    const customer = await createReferral(t, affiliate.id, affiliate.code);
    await t.app
      .get(AffiliateLifecycleHandler)
      .onFeeConfirmed(await confirmFee(t, customer.id, new Date('2026-01-01')));
    const project = await createProject(t, await tokenOf(t, customer));
    const at = new Date('2027-02-01');
    const fundraising = await t.prisma.db.projectFundraising.create({
      data: {
        projectId: project.id,
        ownerId: customer.id,
        amount: 15000000,
        status: 'active',
        paidAt: at,
        reviewedAt: at,
        startsAt: at,
        endsAt: new Date('2027-08-01'),
      },
    });
    await t.app.get(FundraisingCommissionHandler).onReviewed({
      fundraisingId: fundraising.id,
      projectId: project.id,
      projectName: project.name,
      ownerId: customer.id,
      amount: 15000000,
      decision: 'approve',
      reviewedAt: at.toISOString(),
    });
    expect(
      await t.prisma.db.commission.findUnique({ where: { fundraisingId: fundraising.id } }),
    ).toMatchObject({ customerYear: 2, rate: 10, amount: 1500000 });
  });
  it('D-131 rate change year 1 only; renewal policy does not reprice existing snapshots', async () => {
    const { affiliate } = await createAffiliate(t, new Date('2025-01-01'));
    const customer = await createReferral(t, affiliate.id, affiliate.code),
      handler = t.app.get(AffiliateLifecycleHandler);
    for (const year of [2026, 2027])
      await handler.onFeeConfirmed(await confirmFee(t, customer.id, new Date(`${year}-03-15`)));
    const actor = await createUser(t, { systemRole: 'super_admin' });
    await t.app.get(CommissionAdminService).rate({ id: actor.id, ip: null }, [affiliate.id], 25);
    await t.prisma.db.affiliatePolicy.update({ where: { id: 1 }, data: { renewalRate: 15 } });
    await handler.onFeeConfirmed(await confirmFee(t, customer.id, new Date('2028-03-15')));
    expect(
      await t.prisma.db.commission.findMany({
        where: { referredUserId: customer.id },
        orderBy: { customerYear: 'asc' },
        select: { customerYear: true, rate: true, amount: true },
      }),
    ).toEqual([
      { customerYear: 1, rate: 25, amount: 300000 },
      { customerYear: 2, rate: 10, amount: 120000 },
      { customerYear: 3, rate: 15, amount: 180000 },
    ]);
  });
  it('D-131 membership years 1..4: referral stays converted, no zero row', async () => {
    const { affiliate } = await createAffiliate(t, new Date('2025-01-01'));
    const customer = await createReferral(t, affiliate.id, affiliate.code);
    const handler = t.app.get(AffiliateLifecycleHandler);
    for (const year of [2026, 2027, 2028, 2029])
      await handler.onFeeConfirmed(
        await confirmFee(t, customer.id, new Date(`${year}-03-15T00:00:00Z`)),
      );
    const rows = await t.prisma.db.commission.findMany({
      where: { referredUserId: customer.id },
      orderBy: { customerYear: 'asc' },
      select: { customerYear: true, rate: true, amount: true },
    });
    expect(rows).toEqual([
      { customerYear: 1, rate: 20, amount: 240000 },
      { customerYear: 2, rate: 10, amount: 120000 },
      { customerYear: 3, rate: 10, amount: 120000 },
    ]);
    expect(
      await t.prisma.db.referral.findUnique({ where: { referredUserId: customer.id } }),
    ).toMatchObject({ status: 'converted' });
  });
  it('D-131 customer year shared: consumer order and replay are independent', async () => {
    for (const regionalFirst of [true, false]) {
      const { affiliate } = await createAffiliate(t, new Date('2025-01-01'));
      const customer = await createReferral(t, affiliate.id, affiliate.code);
      const p = await confirmFee(t, customer.id, new Date('2026-03-15T00:00:00Z'));
      const affiliateHandler = t.app.get(AffiliateLifecycleHandler),
        regional = t.app.get(RegionalShareEventsHandler);
      if (regionalFirst) await regional.membership(p);
      await affiliateHandler.onFeeConfirmed(p);
      await affiliateHandler.onFeeConfirmed(p);
      await regional.membership(p);
      expect(
        await t.prisma.db.customerYear.findUnique({ where: { userId: customer.id } }),
      ).toMatchObject({ firstPaidAt: new Date(p.confirmedAt) });
      expect(await t.prisma.db.commission.count({ where: { feePeriodId: p.periodId } })).toBe(1);
    }
  });
  it('D-131 idempotent and skips renewalRate zero and years after max', async () => {
    const { affiliate } = await createAffiliate(t, new Date('2025-01-01'));
    const customer = await createReferral(t, affiliate.id, affiliate.code);
    const handler = t.app.get(AffiliateLifecycleHandler);
    await handler.onFeeConfirmed(await confirmFee(t, customer.id, new Date('2026-01-01')));
    await t.prisma.db.affiliatePolicy.update({ where: { id: 1 }, data: { renewalRate: 0 } });
    const p = await confirmFee(t, customer.id, new Date('2027-01-01'));
    await handler.onFeeConfirmed(p);
    await handler.onFeeConfirmed(p);
    expect(await t.prisma.db.commission.count({ where: { referredUserId: customer.id } })).toBe(1);
  });
});
