import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { revenueRetainedSchema } from '@opchub/shared/api-domains';
import { RegionalDirectorService, RevenuePayoutService } from '@/modules/affiliate';
import { affiliateAdminToken } from '../factories/affiliate-admin.factory';
import { flushAuthState } from '../factories/user.factory';
import { createRevenueApp, createRevenueCase, type RevenueCase } from './revenue-sharing.fixture';
import type { TestApp } from '../setup/test-app';

describe('REQ-617 retained total from receipt read-model, not reference commissions', () => {
  let t: TestApp;
  let c: RevenueCase;
  let token: string;
  beforeAll(async () => {
    t = await createRevenueApp();
  });
  beforeEach(async () => {
    await flushAuthState(t);
    c = await createRevenueCase(t);
    token = (await affiliateAdminToken(t, { adminPermissions: ['affiliate.view'] })).token;
  });
  afterEach(async () => c?.cleanup());
  afterAll(async () => t?.close());
  const path = '/admin/affiliate/revenue/retained';
  const read = async () => {
    const res = await t.call(path, { token });
    expect(res.status).toBe(200);
    return revenueRetainedSchema.parse(await res.json());
  };
  const earn = async (id: string, at = '2026-09-01T00:00:00Z', amount = 101) => {
    const period = await c.collect(id, at, amount);
    await c.deliver(period.id);
    return period;
  };

  it('D-119/121 includes vacant and direct receipts exactly once in their own scopes', async () => {
    const before = await read();
    const attributed = await c.customer();
    const direct = await c.newMember();
    const period = await earn(attributed.id);
    await c.deliver(period.id);
    await earn(direct.id);
    await t.prisma.db.regionalDirector.update({
      where: { region: 'north' },
      data: { userId: null, appointedAt: null },
    });
    await earn((await c.customer()).id);
    const result = await read();
    expect(BigInt(result.allReceipts) - BigInt(before.allReceipts)).toBe(252n);
    expect(BigInt(result.affiliateAttributed) - BigInt(before.affiliateAttributed)).toBe(151n);
  });

  it('D-122 late earlier receipt updates unpaid retained allocation in the same transaction', async () => {
    const before = await read();
    const u = await c.customer();
    await earn(u.id);
    await c.collect(u.id, '2025-09-01T00:00:00Z');
    // The generic helper returns the latest period, not the inserted backdated receipt.
    const old = await t.prisma.db.membershipFeePeriod.findFirstOrThrow({
      where: { userId: u.id, createdAt: new Date('2025-09-01T00:00:00Z') },
      select: { id: true },
    });
    expect(BigInt((await read()).affiliateAttributed) - BigInt(before.affiliateAttributed)).toBe(
      61n,
    );
    await c.deliver(old.id);
    const result = await read();
    // Newer receipt moves year1 -> year2: 101 - 40 = 61; older year1 retains 50.
    expect(BigInt(result.allReceipts) - BigInt(before.allReceipts)).toBe(111n);
    expect(BigInt(result.affiliateAttributed) - BigInt(before.affiliateAttributed)).toBe(111n);
  });

  it('AT-GDV04 payout and revocation never deduct the earned allocation twice', async () => {
    const u = await c.customer();
    await earn(u.id);
    const before = await read();
    await t.app
      .get(RevenuePayoutService)
      .record(
        { id: c.actor.id, ip: null },
        c.director.id,
        '2026-09',
        randomUUID(),
        new Date('2026-10-01'),
      );
    expect(await read()).toEqual(before);
    const slot = await t.prisma.db.regionalDirector.findUniqueOrThrow({
      where: { region: 'north' },
    });
    await t.app
      .get(RegionalDirectorService)
      .revoke({ id: c.actor.id, ip: null }, 'north', slot.version, new Date('2026-10-02'));
    expect(await read()).toEqual(before);
  });

  it('REQ-617 requires affiliate.view, even for exact read-only totals', async () => {
    expect((await t.call(path)).status).toBe(401);
    const denied = await affiliateAdminToken(t, { adminPermissions: ['members.view'] });
    const member = await affiliateAdminToken(t, { fee: 'active' });
    for (const auth of [denied.token, member.token])
      expect((await t.call(path, { token: auth })).status).toBe(403);
    await read();
  });
});
