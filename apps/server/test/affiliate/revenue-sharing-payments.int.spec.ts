import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ReconcileService } from '@/modules/membership-fee';
import { FeeTransactionsService } from '@/modules/membership-fee/services/fee-transactions.service';
import { FundraisingService } from '@/modules/project/services/fundraising.service';
import { assignMemberCode } from '../factories/user.factory';
import { FUNDRAISING_PLAN, planAmount } from '../factories/prices';
import { createRevenueApp, createRevenueCase, type RevenueCase } from './revenue-sharing.fixture';
import type { TestApp } from '../setup/test-app';

describe('REQ-617 actual bank receipts across all plans', () => {
  let t: TestApp;
  let c: RevenueCase;
  beforeAll(async () => {
    t = await createRevenueApp();
  });
  beforeEach(async () => {
    c = await createRevenueCase(t);
  });
  afterEach(async () => {
    await c?.cleanup();
  });
  afterAll(async () => {
    await t?.close();
  });

  const bank = (amount: number, at: string, content = 'manual reconciliation') =>
    t.prisma.db.paymentTransaction.create({
      data: {
        provider: 'fake',
        bankTxnId: randomUUID(),
        amount,
        receivedAt: new Date(at),
        content,
        raw: {},
      },
    });
  const funding = async (ownerId: string) => {
    const project = await t.prisma.db.project.create({
      data: { ownerId, name: 'REQ-617 test project' },
    });
    return t.app.get(FundraisingService).start(ownerId, project.id);
  };
  const matchFund = (transactionId: string, fundraisingId: string, now: string) =>
    t.app
      .get(FeeTransactionsService)
      .matchFundraising(
        { id: c.actor.id, ip: null },
        transactionId,
        fundraisingId,
        'REQ-617 actual fee',
        new Date(now),
      );

  it.each(['personal', 'business'] as const)(
    'D-119 automatic %s reconciliation emits actual receipt before any commission consumer',
    async (plan) => {
      const u = await c.customer(plan);
      const code = await assignMemberCode(t, u.id);
      const payment = await bank(
        planAmount(plan),
        '2026-01-31T16:59:59Z',
        `OPCHUB ${code} 0912345678`,
      );
      expect(
        await t.app.get(ReconcileService).match(payment.id, new Date('2026-02-02')),
      ).toMatchObject({ matched: true });
      const period = await t.prisma.db.membershipFeePeriod.findUniqueOrThrow({
        where: { paymentTransactionId: payment.id },
      });
      expect(await c.deliver(period.id)).toMatchObject({
        amount: planAmount(plan),
        plan,
        receivedAt: new Date('2026-01-31T16:59:59Z'),
        recordedAt: new Date('2026-02-02'),
        monthKey: '2026-02',
        directorRate: 50,
      });
      expect(await t.app.get(ReconcileService).match(payment.id)).toMatchObject({ matched: false });
      expect(await t.prisma.db.revenueShare.count({ where: { customerId: u.id } })).toBe(1);
    },
  );

  it('D-119 automatic fundraising records on payment, while still pending_review', async () => {
    const u = await c.customer();
    const f = await funding(u.id);
    const code = await assignMemberCode(t, u.id);
    const payment = await bank(
      f.amount,
      '2026-01-01T00:00:00Z',
      `OPCHUB ${code} 0912345678 ${f.code}`,
    );
    expect(
      await t.app.get(ReconcileService).match(payment.id, new Date('2026-01-02')),
    ).toMatchObject({ matched: true, fundraising: true });
    expect(
      (await t.prisma.db.projectFundraising.findUniqueOrThrow({ where: { id: f.id } })).status,
    ).toBe('pending_review');
    expect(await c.deliver(f.id)).toMatchObject({
      source: 'fundraising',
      plan: 'fundraising',
      amount: f.amount,
      directorAmount: Math.round(f.amount / 2),
    });
    expect(await t.prisma.db.commission.count({ where: { fundraisingId: f.id } })).toBe(0);
  });

  it.each([101, FUNDRAISING_PLAN.amount + 101])(
    'D-119 manual fundraising amount %i uses bank receipt, not package list price',
    async (amount) => {
      const u = await c.customer();
      const f = await funding(u.id);
      const payment = await bank(amount, '2026-01-01T00:00:00Z');
      await matchFund(payment.id, f.id, '2026-01-02');
      expect(await c.deliver(f.id)).toMatchObject({
        amount,
        directorAmount: Math.round(amount / 2),
        directorRate: 50,
      });
      await expect(matchFund(payment.id, f.id, '2026-01-02')).rejects.toThrow('chưa khớp');
      expect(
        await t.prisma.db.revenueShare.count({ where: { source: 'fundraising', sourceId: f.id } }),
      ).toBe(1);
    },
  );

  it('D-122 fundraising first, then membership: one customer epoch across plans', async () => {
    const u = await c.customer();
    const f = await funding(u.id);
    const payment = await bank(101, '2024-01-01T00:00:00Z');
    await matchFund(payment.id, f.id, '2024-01-02');
    expect(await c.deliver(f.id)).toMatchObject({ customerYear: 1, directorRate: 50 });
    const period = await c.collect(u.id, '2025-01-01T00:00:00Z');
    expect(await c.deliver(period.id)).toMatchObject({
      customerYear: 2,
      directorRate: 40,
      firstReceivedAt: new Date('2024-01-01'),
    });
  });

  it.each([false, true])(
    'D-122 late older cross-plan receipt corrects queued/materialized unpaid shares (%s)',
    async (materialized) => {
      const u = await c.customer();
      const p = await c.collect(u.id, '2027-06-01T00:00:00Z');
      if (materialized) expect(await c.deliver(p.id)).toMatchObject({ directorRate: 50 });
      const f = await funding(u.id);
      await t.prisma.db.affiliatePolicy.update({ where: { id: 1 }, data: { yearOneRate: 80 } });
      const payment = await bank(101, '2026-06-01T00:00:00Z');
      await matchFund(payment.id, f.id, '2027-07-01');
      expect(await c.deliver(f.id)).toMatchObject({ directorRate: 80, customerYear: 1 });
      expect(await c.deliver(p.id)).toMatchObject({
        yearOneRate: 50,
        directorRate: 40,
        customerYear: 2,
        directorAmount: 40,
        firstReceivedAt: new Date('2026-06-01'),
        directorId: c.director.id,
      });
      if (materialized) {
        const audit = await t.prisma.db.auditLog.findFirstOrThrow({
          where: {
            entityId: u.id,
            action: 'affiliate.revenue_anchor_corrected',
          },
        });
        expect(audit.diff).toMatchObject({ correctedUnpaid: 1, paidReviewRequired: 0 });
      }
    },
  );

  it('D-122 late leap-day anchor uses the same Vietnam anniversary rule in SQL and TypeScript', async () => {
    const u = await c.customer();
    const p = await c.collect(u.id, '2025-02-27T18:00:00Z');
    await c.deliver(p.id);
    const f = await funding(u.id);
    const payment = await bank(101, '2024-02-28T18:00:00Z');
    await matchFund(payment.id, f.id, '2025-03-01');
    expect(await c.deliver(p.id)).toMatchObject({ customerYear: 2, directorRate: 40 });
  });

  it('D-122 paid snapshots stay immutable; a moved anchor emits one review audit, not a repeated notice', async () => {
    const u = await c.customer();
    const p = await c.collect(u.id, '2027-06-01T00:00:00Z');
    const share = await c.deliver(p.id);
    // Fixture only: payout commands are implemented in the next slice.
    const payout = await t.prisma.db.revenuePayout.create({
      data: {
        requestKey: randomUUID(),
        directorId: c.director.id,
        directorName: 'Director test snapshot',
        region: 'north',
        monthKey: share.monthKey,
        amount: share.directorAmount,
        shareCount: 1,
        bankName: 'Vietcombank',
        bankNo: '0123456789',
        bankHolder: 'DIRECTOR',
        paidBy: c.actor.id,
        paidAt: new Date('2027-07-01'),
      },
    });
    const settled = await t.prisma.db.revenueShare.update({
      where: { id: share.id },
      data: { status: 'paid', payoutId: payout.id },
    });
    const f = await funding(u.id);
    const payment = await bank(101, '2026-06-01T00:00:00Z');
    await matchFund(payment.id, f.id, '2027-07-02');
    expect(await c.deliver(p.id)).toEqual(settled);
    expect(await t.prisma.db.revenuePayout.findUniqueOrThrow({ where: { id: payout.id } })).toEqual(
      payout,
    );
    const audit = await t.prisma.db.auditLog.findFirstOrThrow({
      where: {
        entityId: u.id,
        action: 'affiliate.revenue_anchor_corrected',
      },
    });
    expect(audit.diff).toMatchObject({ correctedUnpaid: 0, paidReviewRequired: 1 });
    await c.collect(u.id, '2027-08-01T00:00:00Z');
    expect(
      await t.prisma.db.auditLog.count({
        where: {
          entityId: u.id,
          action: 'affiliate.revenue_anchor_corrected',
        },
      }),
    ).toBe(1);
  });

  it('D-121 a bank receipt predating appointment earns no retroactive director share', async () => {
    const u = await c.customer();
    const f = await funding(u.id);
    const payment = await bank(101, '2022-12-31T23:59:59Z');
    await matchFund(payment.id, f.id, '2026-01-01');
    expect(await c.deliver(f.id)).toMatchObject({
      directorId: null,
      directorAmount: 0,
      mediaSoftAmount: 101,
    });
  });

  it('concurrent membership/fundraising matching of the same transfer has one winner without deadlock', async () => {
    const u = await c.customer();
    const f = await funding(u.id);
    const payment = await bank(101, '2026-01-01T00:00:00Z');
    const outcomes = await Promise.allSettled([
      matchFund(payment.id, f.id, '2026-01-02'),
      t.app
        .get(FeeTransactionsService)
        .match(
          { id: c.actor.id, ip: null },
          payment.id,
          u.id,
          'concurrent',
          new Date('2026-01-02'),
        ),
    ]);
    expect(outcomes.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const failed = outcomes.find((r) => r.status === 'rejected');
    expect(failed?.status === 'rejected' ? failed.reason : null).toMatchObject({
      code: 'CONFLICT',
    });
    expect(
      await t.prisma.db.outboxEvent.count({
        where: {
          type: 'affiliate.revenue_received',
          payload: { path: ['receipt', 'customerId'], equals: u.id },
        },
      }),
    ).toBe(1);
  });
});
