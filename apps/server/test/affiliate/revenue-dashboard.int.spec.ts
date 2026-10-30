import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { revenueDashboardSchema, revenueFormerSchema } from '@opchub/shared/api-domains';
import { RegionalDirectorService, RevenuePayoutService } from '@/modules/affiliate';
import { affiliateAdminToken } from '../factories/affiliate-admin.factory';
import { flushAuthState } from '../factories/user.factory';
import { createRevenueApp, createRevenueCase, type RevenueCase } from './revenue-sharing.fixture';
import type { TestApp } from '../setup/test-app';

describe('REQ-617 Admin revenue dashboard', () => {
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
  afterEach(async () => {
    await c?.cleanup();
  });
  afterAll(async () => {
    await t?.close();
  });
  const get = (route: string) => t.call(`/admin/affiliate/revenue/${route}`, { token });
  const dashboard = async () => revenueDashboardSchema.parse(await (await get('dashboard')).json());
  const earn = async (at: string, amount = 101) => {
    const member = await c.customer();
    const period = await c.collect(member.id, at, amount);
    return c.deliver(period.id);
  };
  const revoke = async () => {
    const slot = await t.prisma.db.regionalDirector.findUniqueOrThrow({
      where: { region: 'north' },
    });
    await t.app
      .get(RegionalDirectorService)
      .revoke({ id: c.actor.id, ip: null }, 'north', slot.version, new Date('2026-10-01'));
  };

  it('REQ-617 reads DB policy and exact beneficiary totals; repeated affiliate counts only once', async () => {
    const before = await dashboard();
    await earn('2026-08-01', 2_000_000_000);
    await earn('2026-09-01', 2_000_000_000);
    await t.prisma.db.affiliatePolicy.update({
      where: { id: 1 },
      data: { yearOneRate: 63, annualDecrease: 7, minimumRate: 21 },
    });
    const result = await dashboard();
    expect(result.items).toHaveLength(3);
    expect(result.policy).toEqual({ yearOneRate: 63, annualDecrease: 7, minimumRate: 21 });
    const north = result.items.find((r) => r.region === 'north');
    expect(north).toMatchObject({
      directorId: c.director.id,
      current: true,
      bank: { bankNo: '0123456789' },
      stats: {
        receiptCount: '2',
        affiliateCount: '1',
        received: '4000000000',
        allocated: '2000000000',
        due: '2000000000',
        paid: '0',
        mediaSoft: '2000000000',
      },
    });
    expect(BigInt(result.stats.allocated) - BigInt(before.stats.allocated)).toBe(2_000_000_000n);
    expect(BigInt(result.stats.affiliateCount) - BigInt(before.stats.affiliateCount)).toBe(1n);
  });

  it('REQ-617 prototype search filters due/paid by name and scope, not the allocation caption', async () => {
    await earn('2026-08-01');
    await earn('2026-09-01');
    await t.app
      .get(RevenuePayoutService)
      .record(
        { id: c.actor.id, ip: null },
        c.director.id,
        '2026-08',
        randomUUID(),
        new Date('2026-10-01'),
      );
    const all = await dashboard();
    const north = all.items.find((r) => r.region === 'north')!;
    for (const q of ['Miền Bắc', north.name ?? '']) {
      const result = revenueDashboardSchema.parse(
        await (await get(`dashboard?${new URLSearchParams({ q }).toString()}`)).json(),
      );
      expect(result.stats).toEqual(all.stats);
      expect(result.visible).toEqual({ ids: ['north'], due: '51', paid: '51' });
    }
    const empty = revenueDashboardSchema.parse(
      await (await get(`dashboard?q=unmatched-${randomUUID()}`)).json(),
    );
    expect(empty.stats).toEqual(all.stats);
    expect(empty.visible).toEqual({ ids: [], due: '0', paid: '0' });
  });

  it('AT-GDV04 revoked recipient remains discoverable with own bank, unpaid and paid totals', async () => {
    await earn('2026-08-01');
    await earn('2026-09-01');
    await t.app
      .get(RevenuePayoutService)
      .record(
        { id: c.actor.id, ip: null },
        c.director.id,
        '2026-08',
        randomUUID(),
        new Date('2026-10-01'),
      );
    await revoke();
    const current = await dashboard();
    expect(current.items.find((r) => r.region === 'north')).toMatchObject({
      directorId: null,
      bank: null,
      stats: { due: '0', paid: '0' },
    });
    const former = revenueFormerSchema.parse(await (await get('former')).json());
    expect(former.items.find((r) => r.directorId === c.director.id)).toMatchObject({
      current: false,
      region: 'north',
      bank: { bankNo: '0123456789' },
      stats: { due: '51', paid: '51', affiliateCount: '1', receiptCount: '2' },
    });
    const replacement = await c.newMember();
    const slot = await t.prisma.db.regionalDirector.findUniqueOrThrow({
      where: { region: 'north' },
    });
    await t.app
      .get(RegionalDirectorService)
      .appoint(
        { id: c.actor.id, ip: null },
        { region: 'north', userId: replacement.id, version: slot.version },
        new Date('2026-10-01'),
      );
    expect((await dashboard()).items.find((r) => r.region === 'north')).toMatchObject({
      directorId: replacement.id,
      bank: null,
      stats: { due: '0' },
    });
    expect(
      revenueFormerSchema
        .parse(await (await get('former')).json())
        .items.some((r) => r.directorId === replacement.id),
    ).toBe(false);
  });

  it('REQ-617 former list keyset is stable and excludes current incumbents', async () => {
    await earn('2026-09-01');
    await revoke();
    const replacement = await c.newMember();
    const slot = await t.prisma.db.regionalDirector.findUniqueOrThrow({
      where: { region: 'north' },
    });
    await t.app
      .get(RegionalDirectorService)
      .appoint(
        { id: c.actor.id, ip: null },
        { region: 'north', userId: replacement.id, version: slot.version },
        new Date('2026-09-02'),
      );
    await earn('2026-09-03');
    await revoke();
    const all = revenueFormerSchema.parse(await (await get('former?size=100')).json());
    const first = revenueFormerSchema.parse(await (await get('former?size=1')).json());
    expect(first.items).toHaveLength(1);
    expect(first.nextCursor).not.toBeNull();
    const next = revenueFormerSchema.parse(
      await (await get(`former?size=100&beforeId=${first.nextCursor}`)).json(),
    );
    expect([...first.items, ...next.items].map((r) => r.directorId)).toEqual(
      all.items.map((r) => r.directorId),
    );
    expect(all.items.map((r) => r.directorId)).toEqual(
      expect.arrayContaining([c.director.id, replacement.id]),
    );
  });

  it('REQ-617 both dashboard routes enforce read permissions and former cursor validation', async () => {
    const denied = await affiliateAdminToken(t, { adminPermissions: ['members.view'] });
    const member = await affiliateAdminToken(t, { fee: 'active' });
    for (const route of ['dashboard', 'former']) {
      const path = `/admin/affiliate/revenue/${route}`;
      expect((await t.call(path)).status).toBe(401);
      for (const auth of [denied.token, member.token])
        expect((await t.call(path, { token: auth })).status).toBe(403);
    }
    for (const suffix of ['former?size=101', 'former?beforeId=', 'former?status=paid'])
      expect((await get(suffix)).status).toBe(400);
  });
});
