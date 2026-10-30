import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { OutboxRelayService } from '@/common/outbox';
import { RegionalDirectorService, RevenueSharingHandler } from '@/modules/affiliate';
import { MembershipFeeService, RevenueReceiptRegistry } from '@/modules/membership-fee';
import { RevenueCaptureService } from '@/modules/affiliate/services/revenue-capture.service';
import { createRevenueApp, createRevenueCase, type RevenueCase } from './revenue-sharing.fixture';
import type { TestApp } from '../setup/test-app';

describe('REQ-617 transactional revenue outbox', () => {
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

  it('D-119 records manual actual VND, not package price, through the registered real relay', async () => {
    const u = await c.customer();
    const period = await c.collect(u.id, '2026-01-31T17:00:00Z');
    expect(period.createdAt.toISOString()).toBe('2026-01-31T17:00:00.000Z');
    const event = await c.payload(period.id);
    expect(event.data.receipt.amount).toBe(101);
    expect(await t.prisma.db.revenueShare.count({ where: { customerId: u.id } })).toBe(0);
    const relay = t.app.get(OutboxRelayService);
    expect(relay.registeredTypes()).toContain('affiliate.revenue_received');
    await relay.relayOnce();
    const row = await t.prisma.db.revenueShare.findFirstOrThrow({ where: { customerId: u.id } });
    expect(row).toMatchObject({
      source: 'membership',
      sourceId: period.id,
      amount: 101,
      directorAmount: 51,
      mediaSoftAmount: 50,
      directorId: c.director.id,
      directorRate: 50,
      customerYear: 1,
      monthKey: '2026-02',
    });
    expect(
      (await t.prisma.db.outboxEvent.findUniqueOrThrow({ where: { id: event.id } })).dispatchedAt,
    ).not.toBeNull();
    await Promise.all(
      Array.from({ length: 6 }, () => t.app.get(RevenueSharingHandler).received(event.data)),
    );
    expect(await t.prisma.db.revenueShare.count({ where: { customerId: u.id } })).toBe(1);
  });

  it('D-122 renewal covers years 1/2/3/4+ with no dependency on first-commission handling', async () => {
    const u = await c.customer('business');
    const periods = [];
    for (const year of [2023, 2024, 2025, 2026, 2030]) {
      periods.push(await c.collect(u.id, `${year}-06-01T00:00:00Z`, 103));
    }
    // Deliberately reverse delivery; the payment-time epoch/policy remains authoritative.
    for (const period of periods.toReversed()) await c.deliver(period.id);
    const rows = await t.prisma.db.revenueShare.findMany({
      where: { customerId: u.id },
      orderBy: { receivedAt: 'asc' },
    });
    expect(rows.map((r) => r.customerYear)).toEqual([1, 2, 3, 4, 8]);
    expect(rows.map((r) => r.directorRate)).toEqual([50, 40, 30, 20, 20]);
    expect(
      rows.every((r) => r.plan === 'business' && r.directorAmount + r.mediaSoftAmount === 103),
    ).toBe(true);
  });

  it('AT-GDV04 delayed relay retains original director, bank, province and policy after revoke/replacement', async () => {
    const u = await c.customer();
    const p = await c.collect(u.id, '2026-01-10T00:00:00Z');
    const slot = await t.prisma.db.regionalDirector.findUniqueOrThrow({
      where: { region: 'north' },
    });
    const service = t.app.get(RegionalDirectorService);
    await service.revoke(
      { id: c.actor.id, ip: null },
      'north',
      slot.version,
      new Date('2026-01-11'),
    );
    const replacement = await c.newMember();
    await service.appoint(
      { id: c.actor.id, ip: null },
      {
        region: 'north',
        userId: replacement.id,
        version: slot.version + 1,
      },
      new Date('2026-01-12'),
    );
    await t.prisma.db.affiliatePolicy.update({ where: { id: 1 }, data: { yearOneRate: 80 } });
    await t.prisma.db.regionalDirectorProvince.update({
      where: { province: c.group.province },
      data: { region: 'south' },
    });
    expect(await c.deliver(p.id)).toMatchObject({
      directorId: c.director.id,
      directorRate: 50,
      directorAmount: 51,
      region: 'north',
      bankNo: '0123456789',
    });
  });

  it.each(['vacant', 'unassigned', 'no-referral', 'self', 'void'] as const)(
    'D-121 %s leaves 100% actual revenue with Media Soft',
    async (scenario) => {
      const u = await c.customer();
      if (scenario === 'vacant')
        await t.prisma.db.regionalDirector.update({
          where: { region: 'north' },
          data: { userId: null, appointedAt: null },
        });
      if (scenario === 'unassigned')
        await t.prisma.db.regionalDirectorProvince.delete({
          where: { province: c.group.province },
        });
      if (scenario === 'no-referral')
        await t.prisma.db.referral.delete({ where: { referredUserId: u.id } });
      if (scenario === 'self')
        await t.prisma.db.affiliate.update({
          where: { id: c.affiliate.id },
          data: { userId: u.id },
        });
      if (scenario === 'void')
        await t.prisma.db.referral.update({
          where: { referredUserId: u.id },
          data: { status: 'void' },
        });
      const p = await c.collect(u.id, '2026-01-01T00:00:00Z');
      expect(await c.deliver(p.id)).toMatchObject({
        directorId: null,
        directorRate: 0,
        directorAmount: 0,
        mediaSoftAmount: 101,
      });
    },
  );

  it('D-119 trial without payment and explicit zero collection create no revenue event/anchor', async () => {
    const u = await c.customer();
    await t.prisma.db.membershipFee.update({ where: { userId: u.id }, data: { status: 'trial' } });
    await c.collect(u.id, '2026-01-01T00:00:00Z', 0);
    expect(await t.prisma.db.revenueCustomer.findUnique({ where: { userId: u.id } })).toBeNull();
    expect(
      await t.prisma.db.outboxEvent.count({
        where: {
          type: 'affiliate.revenue_received',
          payload: { path: ['receipt', 'customerId'], equals: u.id },
        },
      }),
    ).toBe(0);
  });

  it('rollback after capture removes fee period, epoch and outbox together', async () => {
    const u = await c.customer();
    await expect(
      t.prisma.db.$transaction(async (tx) => {
        await t.app.get(MembershipFeeService).activate(
          tx,
          {
            userId: u.id,
            source: 'manual',
            amount: 101,
            reason: 'rollback test',
          },
          new Date('2026-01-01'),
        );
        throw new Error('abort receipt transaction');
      }),
    ).rejects.toThrow('abort receipt transaction');
    expect(await t.prisma.db.membershipFeePeriod.count({ where: { userId: u.id } })).toBe(0);
    expect(await t.prisma.db.revenueCustomer.findUnique({ where: { userId: u.id } })).toBeNull();
    expect(
      await t.prisma.db.outboxEvent.count({
        where: {
          type: 'affiliate.revenue_received',
          payload: { path: ['receipt', 'customerId'], equals: u.id },
        },
      }),
    ).toBe(0);
  });

  it('missing receipt implementation fails closed instead of committing unshared fees', async () => {
    const u = await c.customer();
    const registry = t.app.get(RevenueReceiptRegistry);
    const absent = new RevenueReceiptRegistry();
    registry.register(absent);
    try {
      await expect(c.collect(u.id, '2026-01-01T00:00:00Z')).rejects.toThrow(
        'Sổ chia sẻ chưa sẵn sàng',
      );
      expect(await t.prisma.db.membershipFeePeriod.count({ where: { userId: u.id } })).toBe(0);
    } finally {
      registry.register(t.app.get(RevenueCaptureService));
    }
  });
});
