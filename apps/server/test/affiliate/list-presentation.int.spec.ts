import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  affiliateAdminPageSchema,
  affiliateAdminCustomersSchema,
} from '@opchub/shared/api-domains';
import { AffiliateLifecycleHandler } from '@/modules/affiliate';
import {
  createAffiliateApp,
  createAffiliate,
  createReferral,
  confirmFee,
} from '../factories/affiliate.factory';
import {
  AFFILIATE_BANK,
  EARNING_DATE,
  affiliateAdminToken,
  affiliateEarning,
} from '../factories/affiliate-admin.factory';
import { flushAuthState } from '../factories/user.factory';
import type { TestApp } from '../setup/test-app';

describe('REQ-312 V2Q-178 native list account/lifetime/period contract', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createAffiliateApp();
  });
  beforeEach(async () => {
    await flushAuthState(t);
  });
  afterAll(async () => {
    await t.close();
  });

  async function list(token: string, id: string, code: string, month?: string) {
    const query = new URLSearchParams({ q: code, size: '1', ...(month ? { month } : {}) });
    const response = await t.call(`/admin/affiliates?${query.toString()}`, { token });
    expect(response.status).toBe(200);
    const item = affiliateAdminPageSchema
      .parse(await response.json())
      .items.find((row) => row.id === id);
    if (!item) throw new Error('Created agent missing from page');
    return item;
  }

  it('returns bank null and explicit zero totals for a real agent without commissions', async () => {
    const { token } = await affiliateAdminToken(t);
    const { affiliate } = await createAffiliate(t, EARNING_DATE);
    const item = await list(token, affiliate.id, affiliate.code, '2026-05');
    expect(item).toMatchObject({
      bank: null,
      hasBank: false,
      lifetime: { customers: 0, revenue: 0 },
      period: {
        month: '2026-05',
        customers: 0,
        commission: 0,
        payable: 0,
        paid: 0,
        status: 'none',
      },
    });
  });

  it('separates lifetime and periods, excludes cancellations, preserves live versus paid bank', async () => {
    const { token } = await affiliateAdminToken(t);
    const owner = await createAffiliate(t, new Date('2026-08-01T04:00:00Z'), 30);
    const august = await createReferral(t, owner.affiliate.id, owner.affiliate.code);
    await t.app
      .get(AffiliateLifecycleHandler)
      .onFeeConfirmed(await confirmFee(t, august.id, new Date('2026-08-15T04:00:00Z')));
    const paid = await affiliateEarning(t, owner);
    await t.prisma.db.affiliate.update({ where: { id: owner.affiliate.id }, data: AFFILIATE_BANK });
    const payout = await t.call(`/admin/affiliates/${owner.affiliate.id}/payouts`, {
      token,
      method: 'POST',
      json: { monthKey: '2026-09' },
      headers: { 'Idempotency-Key': randomUUID() },
    });
    expect(payout.status).toBe(200);
    expect(await payout.json()).toEqual({ paid: 1, amount: 360000 });
    const changed = await t.call(`/admin/affiliates/${owner.affiliate.id}`, {
      token,
      method: 'PATCH',
      json: { rate: 20 },
    });
    expect(changed.status).toBe(200);
    await affiliateEarning(t, owner);
    const cancelled = await affiliateEarning(t, owner);
    expect(
      (
        await t.call('/admin/affiliate/commissions/cancel', {
          token,
          method: 'POST',
          json: { ids: [cancelled.commission.id], reason: 'Invalid attribution fixture' },
        })
      ).status,
    ).toBe(200);
    const liveBank = { bankName: 'ACB', bankNo: '24681357', bankHolder: 'LE THU HA' };
    await t.prisma.db.affiliate.update({ where: { id: owner.affiliate.id }, data: liveBank });
    const get = (month?: string) => list(token, owner.affiliate.id, owner.affiliate.code, month);
    const september = await get('2026-09');
    expect(september).toMatchObject({
      bank: liveBank,
      hasBank: true,
      customers: 2,
      revenue: 2400000,
      rate: 20,
      balance: 240000,
      paid: 360000,
      lifetime: { customers: 3, revenue: 3600000 },
      period: {
        month: '2026-09',
        customers: 2,
        commission: 600000,
        payable: 240000,
        paid: 360000,
        status: 'mixed',
      },
    });
    expect((await get('2026-08')).period).toEqual({
      month: '2026-08',
      customers: 1,
      commission: 240000,
      payable: 240000,
      paid: 0,
      status: 'recorded',
    });
    expect((await get('2026-05')).lifetime).toEqual(september.lifetime);
    expect((await get('2026-05')).period.commission).toBe(0);
    expect((await get()).period).toMatchObject({
      month: null,
      customers: 3,
      commission: 840000,
      payable: 480000,
      paid: 360000,
      status: 'mixed',
    });
    const history = await t.call(`/admin/affiliates/${owner.affiliate.id}/customers?size=100`, {
      token,
    });
    expect(history.status).toBe(200);
    expect(
      affiliateAdminCustomersSchema
        .parse(await history.json())
        .items.find((row) => row.id === paid.commission.id)?.bank,
    ).toEqual(AFFILIATE_BANK);
  });

  it('does not expose the additive bank payload without the existing view permission', async () => {
    const { token } = await affiliateAdminToken(t, { adminPermissions: [] });
    const response = await t.call('/admin/affiliates?size=1', { token });
    expect(response.status).toBe(403);
    expect(await response.text()).not.toContain('bankNo');
  });
});
