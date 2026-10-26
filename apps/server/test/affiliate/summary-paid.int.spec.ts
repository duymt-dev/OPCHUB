import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { affiliateSummarySchema } from '@opchub/shared/api-domains';
import { createAffiliateApp, createAffiliate } from '../factories/affiliate.factory';
import {
  AFFILIATE_BANK,
  EARNING_DATE,
  affiliateAdminToken,
  affiliateEarning,
} from '../factories/affiliate-admin.factory';
import { flushAuthState } from '../factories/user.factory';
import type { TestApp } from '../setup/test-app';

describe('REQ-312 V2Q-174 server-owned paid summary', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createAffiliateApp();
    await flushAuthState(t);
  });
  afterAll(async () => {
    await t.close();
  });

  it('returns zero paid and existing totals for an empty month', async () => {
    const { token } = await affiliateAdminToken(t);
    const response = await t.call('/admin/affiliate/summary?month=2099-12', { token });
    expect(response.status).toBe(200);
    expect(affiliateSummarySchema.parse(await response.json())).toEqual({
      revenue: 0,
      totalCommission: 0,
      payable: 0,
      paid: 0,
      netRevenue: 0,
    });
  });

  it('sums only paid amounts, preserves recorded/cancelled semantics and month scope', async () => {
    const { token } = await affiliateAdminToken(t);
    const summary = async (month = '') => {
      const res = await t.call(`/admin/affiliate/summary${month ? `?month=${month}` : ''}`, {
        token,
      });
      expect(res.status).toBe(200);
      return affiliateSummarySchema.parse(await res.json());
    };
    const before = await summary('2026-09');
    const allBefore = await summary();
    const otherBefore = await summary('2026-08');
    const paid = await affiliateEarning(t);
    const recordedOwner = await createAffiliate(t, EARNING_DATE, 30);
    await affiliateEarning(t, recordedOwner);
    const cancelledOwner = await createAffiliate(t, EARNING_DATE, 50);
    const cancelled = await affiliateEarning(t, cancelledOwner);
    await t.prisma.db.affiliate.update({
      where: { id: paid.affiliate.id },
      data: {
        bankName: AFFILIATE_BANK.bankName,
        bankNo: AFFILIATE_BANK.bankNo,
        bankHolder: AFFILIATE_BANK.bankHolder,
      },
    });
    const payout = await t.call(`/admin/affiliates/${paid.affiliate.id}/payouts`, {
      method: 'POST',
      token,
      json: { monthKey: '2026-09' },
      headers: { 'Idempotency-Key': randomUUID() },
    });
    expect(payout.status).toBe(200);
    expect(await payout.json()).toEqual({ paid: 1, amount: 240000 });
    const cancel = await t.call('/admin/affiliate/commissions/cancel', {
      method: 'POST',
      token,
      json: { ids: [cancelled.commission.id], reason: 'Fixture violation' },
    });
    expect(cancel.status).toBe(200);
    expect(await cancel.json()).toEqual({ cancelled: 1 });
    const delta = {
      revenue: 2400000,
      totalCommission: 600000,
      payable: 360000,
      paid: 240000,
      netRevenue: 1800000,
    };
    const after = await summary('2026-09');
    const allAfter = await summary();
    for (const key of ['revenue', 'totalCommission', 'payable', 'paid', 'netRevenue'] as const) {
      expect(after[key] - before[key], key).toBe(delta[key]);
      expect(allAfter[key] - allBefore[key], key).toBe(delta[key]);
    }
    expect(await summary('2026-08')).toEqual(otherBefore);
  });
});
