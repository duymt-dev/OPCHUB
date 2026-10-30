import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  revenueBalanceSchema,
  revenueLedgerSchema,
  revenueMonthsSchema,
} from '@opchub/shared/api-domains';
import { RegionalDirectorService, RevenuePayoutService } from '@/modules/affiliate';
import { affiliateAdminToken } from '../factories/affiliate-admin.factory';
import { flushAuthState } from '../factories/user.factory';
import { createRevenueApp, createRevenueCase, type RevenueCase } from './revenue-sharing.fixture';
import type { TestApp } from '../setup/test-app';

describe('REQ-617 Admin revenue ledger read models', () => {
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
  const get = (suffix: string, id = c.director.id) =>
    t.call(`/admin/affiliate/revenue/${id}/${suffix}`, { token });
  const earn = async (at: string, amount = 101) => {
    const customer = await c.customer();
    const period = await c.collect(customer.id, at, amount);
    return c.deliver(period.id);
  };

  it('REQ-617 known empty director returns zero balances and empty pages; unknown returns404', async () => {
    expect(revenueBalanceSchema.parse(await (await get('balance')).json())).toEqual({
      receiptCount: '0',
      received: '0',
      allocated: '0',
      paid: '0',
      due: '0',
      mediaSoft: '0',
    });
    expect(revenueLedgerSchema.parse(await (await get('shares')).json())).toEqual({
      items: [],
      nextCursor: null,
    });
    expect(revenueMonthsSchema.parse(await (await get('months')).json())).toEqual({
      items: [],
      nextCursor: null,
    });
    for (const route of ['balance', 'shares', 'months'])
      expect((await get(route, 'unknown')).status).toBe(404);
  });

  it('REQ-617 stable tied cursors return every receipt once with batched live names and immutable amounts', async () => {
    const rows = [await earn('2026-09-01'), await earn('2026-09-01'), await earn('2026-09-01')];
    const first = revenueLedgerSchema.parse(await (await get('shares?size=2')).json());
    expect(first.items).toHaveLength(2);
    expect(first.nextCursor).not.toBeNull();
    const cursor = first.nextCursor!;
    const second = revenueLedgerSchema.parse(
      await (await get(`shares?size=2&beforeAt=${cursor.at}&beforeId=${cursor.id}`)).json(),
    );
    const items = [...first.items, ...second.items];
    expect(items.map((r) => r.id)).toEqual(
      rows
        .map((r) => r.id)
        .sort()
        .reverse(),
    );
    expect(second.nextCursor).toBeNull();
    expect(items.every((r) => r.customerName && r.affiliateName)).toBe(true);
    expect(items[0]).toMatchObject({
      amount: 101,
      directorRate: 50,
      directorAmount: 51,
      mediaSoftAmount: 50,
      customerYear: 1,
      status: 'recorded',
      payoutId: null,
    });
    expect(Object.keys(items[0]!)).not.toContain('bankNo');
  });

  it('REQ-617 exact totals exceed Int32 and refresh after payout, monthly cursors do not skip a month', async () => {
    await earn('2026-07-01', 2_000_000_000);
    await earn('2026-08-01', 2_000_000_000);
    await earn('2026-09-01', 2_000_000_000);
    const before = revenueBalanceSchema.parse(await (await get('balance')).json());
    expect(before).toEqual({
      receiptCount: '3',
      received: '6000000000',
      allocated: '3000000000',
      due: '3000000000',
      paid: '0',
      mediaSoft: '3000000000',
    });
    const receipt = await t.app
      .get(RevenuePayoutService)
      .record(
        { id: c.actor.id, ip: null },
        c.director.id,
        '2026-08',
        randomUUID(),
        new Date('2026-10-01'),
      );
    expect(revenueBalanceSchema.parse(await (await get('balance')).json())).toEqual({
      ...before,
      due: '2000000000',
      paid: '1000000000',
    });
    const first = revenueMonthsSchema.parse(await (await get('months?size=2')).json());
    expect(first.items.map((m) => m.monthKey)).toEqual(['2026-09', '2026-08']);
    expect(first.items[1]).toMatchObject({ due: '0', paid: '1000000000', receiptCount: '1' });
    expect(first.nextCursor).toBe('2026-08');
    const second = revenueMonthsSchema.parse(
      await (await get(`months?size=2&beforeMonth=${first.nextCursor}`)).json(),
    );
    expect(second.items.map((m) => m.monthKey)).toEqual(['2026-07']);
    expect(second.nextCursor).toBeNull();
    const ledger = revenueLedgerSchema.parse(await (await get('shares')).json());
    expect(ledger.items.find((r) => r.monthKey === '2026-08')).toMatchObject({
      status: 'paid',
      payoutId: receipt.id,
    });
  });

  it('AT-GDV04 revocation/replacement never hides or transfers former director balances', async () => {
    const row = await earn('2026-09-01');
    const replacement = await c.newMember();
    const slot = await t.prisma.db.regionalDirector.findUniqueOrThrow({
      where: { region: 'north' },
    });
    await t.app
      .get(RegionalDirectorService)
      .revoke({ id: c.actor.id, ip: null }, 'north', slot.version, new Date('2026-10-01'));
    await t.app.get(RegionalDirectorService).appoint(
      { id: c.actor.id, ip: null },
      {
        region: 'north',
        userId: replacement.id,
        version: slot.version + 1,
      },
      new Date('2026-10-01'),
    );
    expect(revenueBalanceSchema.parse(await (await get('balance')).json()).due).toBe('51');
    expect(
      revenueLedgerSchema.parse(await (await get('shares')).json()).items.map((r) => r.id),
    ).toEqual([row.id]);
    expect(
      revenueBalanceSchema.parse(await (await get('balance', replacement.id)).json()).due,
    ).toBe('0');
    expect(
      revenueLedgerSchema.parse(await (await get('shares', replacement.id)).json()).items,
    ).toEqual([]);
  });

  it('REQ-617 missing/deleted display identities never remove financial records or fabricate names', async () => {
    const row = await earn('2026-09-01');
    await t.prisma.db.user.updateMany({
      where: { id: { in: [row.customerId, c.referrer.id] } },
      data: { deletedAt: new Date() },
    });
    const item = revenueLedgerSchema.parse(await (await get('shares')).json()).items[0];
    expect(item).toMatchObject({
      id: row.id,
      customerName: null,
      affiliateName: null,
      directorAmount: 51,
    });
    expect(revenueBalanceSchema.parse(await (await get('balance')).json()).due).toBe('51');
  });

  it('REQ-617 read permission is required on every route; malformed keysets return400', async () => {
    const denied = await affiliateAdminToken(t, { adminPermissions: ['members.view'] });
    const member = await affiliateAdminToken(t, { fee: 'active' });
    for (const route of ['balance', 'shares', 'months']) {
      const path = `/admin/affiliate/revenue/${c.director.id}/${route}`;
      expect((await t.call(path)).status).toBe(401);
      for (const userToken of [denied.token, member.token])
        expect((await t.call(path, { token: userToken })).status).toBe(403);
    }
    for (const suffix of [
      'shares?size=101',
      'shares?beforeAt=2026-10-01T00:00:00Z',
      'shares?beforeId=bad',
      'months?beforeMonth=2026-13',
      'months?size=0',
      'shares?status=paid',
    ]) {
      expect((await get(suffix)).status).toBe(400);
    }
  });
});
