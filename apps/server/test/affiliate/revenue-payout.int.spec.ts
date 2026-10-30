import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  RevenuePayoutNotifyHandler,
  RevenuePayoutService,
  RegionalDirectorService,
} from '@/modules/affiliate';
import { MembershipFeeService } from '@/modules/membership-fee';
import { OutboxService } from '@/common/outbox';
import { RevenuePayoutRepository } from '@/modules/affiliate/repositories/revenue-payout.repository';
import { relayAffiliateEvent } from '../factories/affiliate-admin.factory';
import { flushAuthState } from '../factories/user.factory';
import { createRevenueApp, createRevenueCase, type RevenueCase } from './revenue-sharing.fixture';
import type { TestApp } from '../setup/test-app';

function signal() {
  let resolve: () => void = () => {
    throw new Error('Signal not initialized');
  };
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('REQ-617 director payout transaction and history', () => {
  let t: TestApp;
  let c: RevenueCase;
  beforeAll(async () => {
    t = await createRevenueApp();
  });
  beforeEach(async () => {
    c = await createRevenueCase(t);
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await c?.cleanup();
  });
  afterAll(async () => {
    await t?.close();
  });
  const service = () => t.app.get(RevenuePayoutService);
  const pay = (key = randomUUID(), month = '2026-09') =>
    service().record(
      { id: c.actor.id, ip: null },
      c.director.id,
      month,
      key,
      new Date('2026-10-01'),
    );
  const earn = async (at = '2026-09-10T00:00:00Z', amount = 101) => {
    const user = await c.customer();
    const period = await c.collect(user.id, at, amount);
    return { user, period, share: await c.deliver(period.id) };
  };

  it('REQ-617 records one durable receipt, audit and relay notification; retry survives Redis loss', async () => {
    const { share } = await earn();
    const key = randomUUID();
    const receipt = await pay(key);
    expect(receipt).toMatchObject({ directorId: c.director.id, amount: '51', shareCount: 1 });
    await flushAuthState(t);
    expect(await pay(key)).toEqual(receipt);
    expect(
      await t.prisma.db.revenueShare.findUniqueOrThrow({ where: { id: share.id } }),
    ).toMatchObject({ status: 'paid', payoutId: receipt.id });
    expect(
      await t.prisma.db.auditLog.count({
        where: { action: 'affiliate.revenue_payout', entityId: receipt.id },
      }),
    ).toBe(1);
    const event = await t.prisma.db.outboxEvent.findFirstOrThrow({
      where: {
        type: 'affiliate.revenue_payout_recorded',
        payload: { path: ['payoutId'], equals: receipt.id },
      },
    });
    await relayAffiliateEvent(t, event.id);
    await t.app.get(RevenuePayoutNotifyHandler).recorded({ payoutId: receipt.id });
    const notices = await t.prisma.db.notification.findMany({
      where: { id: `revenue:payout:${receipt.id}` },
    });
    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatchObject({ userId: c.director.id });
    expect(notices[0]?.body).toContain(receipt.bank.bankNo);
  });

  it('REQ-617 two keys racing for one director/month cannot double pay', async () => {
    await earn();
    const results = await Promise.allSettled([pay(), pay()]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((r) => r.status === 'rejected')).toMatchObject({
      reason: { code: 'CONFLICT' },
    });
    expect(await t.prisma.db.revenuePayout.count({ where: { directorId: c.director.id } })).toBe(1);
  });

  it('AT-GDV04 revoked director remains payable; replacement bank never receives their earnings', async () => {
    await earn();
    const slot = await t.prisma.db.regionalDirector.findUniqueOrThrow({
      where: { region: 'north' },
    });
    await t.app
      .get(RegionalDirectorService)
      .revoke({ id: c.actor.id, ip: null }, 'north', slot.version, new Date('2026-09-20'));
    const replacement = await c.newMember();
    await t.app.get(RegionalDirectorService).appoint(
      { id: c.actor.id, ip: null },
      {
        region: 'north',
        userId: replacement.id,
        version: slot.version + 1,
      },
      new Date('2026-09-21'),
    );
    await t.prisma.db.regionalDirector.update({
      where: { region: 'north' },
      data: { bankName: 'Vietcombank', bankNo: '99999999', bankHolder: 'REPLACEMENT' },
    });
    expect(await pay()).toMatchObject({
      directorId: c.director.id,
      bank: { bankNo: '0123456789' },
    });
  });

  it('REQ-617 uses same incumbent current bank, then preserves the paid destination and history', async () => {
    await earn();
    await t.prisma.db.regionalDirector.update({
      where: { region: 'north' },
      data: { bankNo: '88888888' },
    });
    const receipt = await pay();
    expect(receipt.bank.bankNo).toBe('88888888');
    await t.prisma.db.regionalDirector.update({
      where: { region: 'north' },
      data: { bankNo: '77777777' },
    });
    const history = await service().history({ directorId: c.director.id, size: 20 });
    expect(history.items).toEqual([receipt]);
    expect(history.nextCursor).toBeNull();
  });

  it('REQ-617 missing bank rolls back the entire receipt/share/audit/outbox transaction', async () => {
    const { share } = await earn();
    await t.prisma.db.regionalDirector.update({
      where: { region: 'north' },
      data: { bankName: null, bankNo: null, bankHolder: null },
    });
    await expect(pay()).rejects.toMatchObject({ code: 'CONFLICT' });
    expect(await t.prisma.db.revenuePayout.count({ where: { directorId: c.director.id } })).toBe(0);
    expect(
      (await t.prisma.db.revenueShare.findUniqueOrThrow({ where: { id: share.id } })).status,
    ).toBe('recorded');
  });

  it('REQ-617 outbox failure rolls back an already-created receipt and paid transition', async () => {
    const { share } = await earn();
    const failure = new Error('Injected outbox storage failure');
    vi.spyOn(t.app.get(OutboxService), 'add').mockRejectedValueOnce(failure);
    await expect(pay()).rejects.toBe(failure);
    expect(await t.prisma.db.revenuePayout.count({ where: { directorId: c.director.id } })).toBe(0);
    expect(
      await t.prisma.db.revenueShare.findUniqueOrThrow({ where: { id: share.id } }),
    ).toMatchObject({ status: 'recorded', payoutId: null });
  });

  it('D-122 real paid receipt remains unchanged after an older receipt; audit requests review', async () => {
    const { user, share } = await earn();
    const receipt = await pay();
    await c.collect(user.id, '2025-09-01');
    expect((await service().history({ directorId: c.director.id, size: 20 })).items).toEqual([
      receipt,
    ]);
    expect(
      await t.prisma.db.revenueShare.findUniqueOrThrow({ where: { id: share.id } }),
    ).toMatchObject({ status: 'paid', directorAmount: 51, payoutId: receipt.id });
    const audit = await t.prisma.db.auditLog.findFirstOrThrow({
      where: {
        entityId: user.id,
        action: 'affiliate.revenue_anchor_corrected',
      },
    });
    expect(audit.diff).toMatchObject({ paidReviewRequired: 1 });
  });

  it('REQ-617 sums more than signed 32-bit VND without overflow and pages tied history timestamps', async () => {
    await earn('2026-09-10', 2_147_483_647);
    await earn('2026-09-11', 2_147_483_647);
    const first = await pay();
    expect(first.amount).toBe('2147483648');
    await earn('2026-08-10');
    const second = await pay(randomUUID(), '2026-08');
    const head = await service().history({ directorId: c.director.id, size: 1 });
    expect(head.nextCursor).not.toBeNull();
    const tail = await service().history({
      directorId: c.director.id,
      size: 1,
      beforeAt: head.nextCursor?.at,
      beforeId: head.nextCursor?.id,
    });
    expect([...head.items, ...tail.items].map((r) => r.id).sort()).toEqual(
      [first.id, second.id].sort(),
    );
    expect(tail.nextCursor).toBeNull();
  });

  it('D-122 payout waits for locked correction rows BEFORE summing; no stale pre-lock total', async () => {
    const { user } = await earn();
    const corrected = signal();
    const release = signal();
    const entered = signal();
    const repo = t.app.get(RevenuePayoutRepository);
    const original = repo.lockShares.bind(repo);
    vi.spyOn(repo, 'lockShares').mockImplementation((...args) => {
      entered.resolve();
      return original(...args);
    });
    const correction = t.prisma.db.$transaction(async (tx) => {
      await t.app.get(MembershipFeeService).activate(
        tx,
        {
          userId: user.id,
          amount: 101,
          source: 'manual',
          reason: 'Late older receipt',
        },
        new Date('2025-09-10'),
      );
      corrected.resolve();
      await release.promise;
    });
    await corrected.promise;
    const payout = pay();
    await entered.promise;
    release.resolve();
    await correction;
    expect(await payout).toMatchObject({ amount: '40', shareCount: 1 });
  });
});
