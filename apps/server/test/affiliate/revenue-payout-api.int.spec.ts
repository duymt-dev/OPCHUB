import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { revenuePayoutHistorySchema, revenuePayoutSchema } from '@opchub/shared/api-domains';
import { apiErrorSchema } from '@opchub/shared/api';
import { affiliateAdminToken } from '../factories/affiliate-admin.factory';
import { flushAuthState } from '../factories/user.factory';
import { createRevenueApp, createRevenueCase, type RevenueCase } from './revenue-sharing.fixture';
import type { TestApp } from '../setup/test-app';

describe('REQ-617 director payout HTTP permissions and validation', () => {
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
  const path = () => `/admin/affiliate/revenue/${c.director.id}/payouts`;
  const earn = async () => {
    const customer = await c.customer();
    const period = await c.collect(customer.id, '2026-09-01');
    await c.deliver(period.id);
  };

  it('REQ-617 view-only cannot pay; affiliate.payout can pay with durable JSON receipt and read history', async () => {
    await earn();
    const view = await affiliateAdminToken(t, { adminPermissions: ['affiliate.view'] });
    const accountant = await affiliateAdminToken(t, {
      adminPermissions: ['affiliate.view', 'affiliate.payout'],
    });
    const request = {
      method: 'POST',
      json: { monthKey: '2026-09' },
      headers: { 'Idempotency-Key': randomUUID() },
    };
    expect((await t.call(path(), { ...request, token: view.token })).status).toBe(403);
    const res = await t.call(path(), { ...request, token: accountant.token });
    expect(res.status).toBe(200);
    const receipt = revenuePayoutSchema.parse(await res.json());
    expect(receipt).toMatchObject({ amount: '51', paidBy: accountant.user.id });
    const history = await t.call(`/admin/affiliate/revenue/payouts?directorId=${c.director.id}`, {
      token: view.token,
    });
    expect(history.status).toBe(200);
    expect(revenuePayoutHistorySchema.parse(await history.json()).items).toEqual([receipt]);
  });

  it('REQ-617 missing read permission and member tokens cannot inspect bank history', async () => {
    const denied = await affiliateAdminToken(t, { adminPermissions: ['members.view'] });
    const member = await affiliateAdminToken(t, { fee: 'active' });
    for (const token of [denied.token, member.token]) {
      expect((await t.call('/admin/affiliate/revenue/payouts', { token })).status).toBe(403);
      expect(
        (await t.call(path(), { token, method: 'POST', json: { monthKey: '2026-09' } })).status,
      ).toBe(403);
    }
  });

  it('REQ-617 invalid body/cursor/missing key =>400; oversized body=>413; unknown director=>404', async () => {
    const { token } = await affiliateAdminToken(t);
    const headers = { 'Idempotency-Key': randomUUID() };
    const bad = await t.call(path(), {
      method: 'POST',
      token,
      headers,
      json: { monthKey: '2026-13' },
    });
    expect(bad.status).toBe(400);
    expect(apiErrorSchema.parse(await bad.json()).error.fields?.length).toBeGreaterThan(0);
    expect(
      (await t.call(path(), { method: 'POST', token, json: { monthKey: '2026-09' } })).status,
    ).toBe(400);
    expect(
      (
        await t.call(path(), {
          method: 'POST',
          token,
          headers,
          json: { monthKey: 'x'.repeat(800000) },
        })
      ).status,
    ).toBe(413);
    expect(
      (
        await t.call('/admin/affiliate/revenue/unknown/payouts', {
          method: 'POST',
          token,
          headers,
          json: { monthKey: '2026-09' },
        })
      ).status,
    ).toBe(404);
    expect(
      (await t.call('/admin/affiliate/revenue/payouts?beforeAt=2026-10-01T00:00:00Z', { token }))
        .status,
    ).toBe(400);
  });

  it('REQ-617 open month and already paid month reject with409; replay does not mutate totals', async () => {
    await earn();
    const { token } = await affiliateAdminToken(t);
    const key = randomUUID();
    const post = (monthKey: string, idempotencyKey = key) =>
      t.call(path(), {
        token,
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
        json: { monthKey },
      });
    const current = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 7);
    expect((await post(current)).status).toBe(409);
    const res = await post('2026-09');
    expect(res.status).toBe(200);
    const receipt = revenuePayoutSchema.parse(await res.json());
    expect(revenuePayoutSchema.parse(await (await post('2026-09')).json())).toEqual(receipt);
    expect((await post('2026-09', randomUUID())).status).toBe(409);
  });
});
