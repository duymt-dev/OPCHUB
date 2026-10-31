import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { affiliatePolicySchema, revenueDashboardSchema } from '@opchub/shared/api-domains';
import { apiErrorSchema } from '@opchub/shared/api';
import { affiliateAdminToken } from '../factories/affiliate-admin.factory';
import { flushAuthState } from '../factories/user.factory';
import { createRevenueApp, createRevenueCase, type RevenueCase } from './revenue-sharing.fixture';
import type { TestApp } from '../setup/test-app';

const path = '/admin/affiliate/policy';
describe('REQ-617 D-119 configurable sharing policy over real HTTP/DB', () => {
  let t: TestApp;
  let c: RevenueCase;
  beforeAll(async () => {
    t = await createRevenueApp();
  });
  beforeEach(async () => {
    await flushAuthState(t);
    c = await createRevenueCase(t);
  });
  afterEach(async () => {
    await c?.cleanup();
  });
  afterAll(async () => {
    await t?.close();
  });
  const read = async (token: string) => {
    const response = await t.call(path, { token });
    expect(response.status).toBe(200);
    return affiliatePolicySchema.parse(await response.json());
  };

  it('persists all three rates, returns them to readers/dashboard and audits before/after', async () => {
    const admin = await affiliateAdminToken(t);
    const viewer = await affiliateAdminToken(t, { adminPermissions: ['affiliate.view'] });
    const before = await read(admin.token);
    const next = { ...before, yearOneRate: 63, annualDecrease: 7, minimumRate: 21 };
    const res = await t.call(path, { method: 'PUT', token: admin.token, json: next });
    expect(res.status).toBe(200);
    expect(affiliatePolicySchema.parse(await res.json())).toEqual(next);
    expect(await read(viewer.token)).toEqual(next);
    const dashboard = await t.call('/admin/affiliate/revenue/dashboard', { token: viewer.token });
    expect(revenueDashboardSchema.parse(await dashboard.json()).policy).toEqual({
      yearOneRate: 63,
      annualDecrease: 7,
      minimumRate: 21,
    });
    const audits = await t.prisma.db.auditLog.findMany({
      where: { actorId: admin.user.id, action: 'affiliate.policy_update' },
    });
    expect(audits).toHaveLength(1);
    expect(audits[0]?.diff).toEqual({ before, after: next });
  });

  it('rejects unauthorized and invalid edits with field errors, no policy write or audit', async () => {
    const admin = await affiliateAdminToken(t);
    const viewer = await affiliateAdminToken(t, { adminPermissions: ['affiliate.view'] });
    const original = await read(admin.token);
    expect(
      (await t.call(path, { method: 'PUT', token: viewer.token, json: original })).status,
    ).toBe(403);
    for (const [field, value] of [
      ['yearOneRate', undefined],
      ['yearOneRate', 101],
      ['yearOneRate', 1.5],
      ['annualDecrease', -1],
      ['annualDecrease', '7'],
      ['minimumRate', 51],
    ] as const) {
      const res = await t.call(path, {
        method: 'PUT',
        token: admin.token,
        json: { ...original, [field]: value },
      });
      expect(res.status).toBe(400);
      expect(apiErrorSchema.parse(await res.json()).error.fields?.[0]?.path).toBe(field);
    }
    expect(await read(admin.token)).toEqual(original);
    expect(
      await t.prisma.db.auditLog.count({
        where: {
          actorId: { in: [admin.user.id, viewer.user.id] },
          action: 'affiliate.policy_update',
        },
      }),
    ).toBe(0);
  });

  it('freezes paid, recorded and pending receipts while future receipts use the saved policy', async () => {
    const admin = await affiliateAdminToken(t);
    const u = await c.customer();
    const paid = await c.collect(u.id, '2024-01-01T00:00:00Z', 101);
    await c.deliver(paid.id);
    const payout = await t.call(`/admin/affiliate/revenue/${c.director.id}/payouts`, {
      method: 'POST',
      token: admin.token,
      json: { monthKey: '2024-01' },
      headers: { 'Idempotency-Key': `policy-${u.id}` },
    });
    expect(payout.status).toBe(200);
    const recorded = await c.collect(u.id, '2025-01-01T00:00:00Z', 101);
    await c.deliver(recorded.id);
    const frozen = await t.prisma.db.revenueShare.findMany({
      where: { customerId: u.id },
      orderBy: { receivedAt: 'asc' },
    });
    expect(frozen.map((r) => r.status)).toEqual(['paid', 'recorded']);
    const pending = await c.collect(u.id, '2026-01-01T00:00:00Z', 101);
    const next = {
      ...(await read(admin.token)),
      yearOneRate: 63,
      annualDecrease: 7,
      minimumRate: 21,
    };
    expect((await t.call(path, { method: 'PUT', token: admin.token, json: next })).status).toBe(
      200,
    );
    expect(await c.deliver(pending.id)).toMatchObject({ customerYear: 3, directorRate: 30 });
    for (const [year, rate] of [
      [2027, 42],
      [2035, 21],
    ] as const) {
      const p = await c.collect(u.id, `${year}-01-01T00:00:00Z`, 101);
      expect(await c.deliver(p.id)).toMatchObject({ directorRate: rate, directorAmount: rate });
    }
    const newcomer = await c.customer();
    const p = await c.collect(newcomer.id, '2026-01-01T00:00:00Z', 101);
    expect(await c.deliver(p.id)).toMatchObject({
      customerYear: 1,
      directorRate: 63,
      directorAmount: 64,
    });
    expect(
      await t.prisma.db.revenueShare.findMany({
        where: { id: { in: frozen.map((r) => r.id) } },
        orderBy: { receivedAt: 'asc' },
      }),
    ).toEqual(frozen);
  });
});
