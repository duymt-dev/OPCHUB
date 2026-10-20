import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { apiErrorSchema } from '@opchub/shared/api';
import { affiliateAdminPolicyPreviewSchema } from '@opchub/shared/api-domains';
import { createAffiliateApp } from '../factories/affiliate.factory';
import {
  AFFILIATE_BANK,
  affiliateAdminToken,
  affiliateEarning,
} from '../factories/affiliate-admin.factory';
import { flushAuthState, loginOf, tokenBodySchema } from '../factories/user.factory';
import type { TestApp } from '../setup/test-app';

const PATH = '/admin/affiliate/policy/preview';

describe('REQ-308 REQ-312 native Admin draft policy preview (TIP-402C)', () => {
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

  it('allows a viewer to preview draft rates, including both boundaries', async () => {
    const { token } = await affiliateAdminToken(t, { adminPermissions: ['affiliate.view'] });
    for (const [rate, commission] of [
      [1, 6000],
      [20, 120000],
      [27, 162000],
      [50, 300000],
    ]) {
      const response = await t.call(`${PATH}?rate=${rate}`, { token });
      expect(response.status).toBe(200);
      expect(affiliateAdminPolicyPreviewSchema.parse(await response.json())).toEqual({
        rate,
        feeAmount: 600000,
        commission,
      });
    }
  });

  it('returns standard rate field errors for missing, empty and invalid draft rates', async () => {
    const { token } = await affiliateAdminToken(t);
    for (const query of ['', '?rate=', '?rate=0', '?rate=51', '?rate=1.5', '?rate=oops']) {
      const response = await t.call(`${PATH}${query}`, { token });
      expect(response.status).toBe(400);
      const error = apiErrorSchema.parse(await response.json()).error;
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.fields).toHaveLength(1);
      expect(error.fields?.[0]?.path).toBe('rate');
      expect(typeof error.fields?.[0]?.message).toBe('string');
    }
  });

  it('denies a previously issued session after a real account lock; fresh login works after unlock', async () => {
    const owner = await affiliateAdminToken(t);
    const viewer = await affiliateAdminToken(t, { adminPermissions: ['affiliate.view'] });
    const status = (value: 'locked' | 'active') =>
      t.call(`/admin/admin-accounts/${viewer.user.id}/status`, {
        method: 'POST',
        token: owner.token,
        json: { status: value, reason: 'Preview guard test' },
      });
    expect((await t.call(`${PATH}?rate=20`, { token: viewer.token })).status).toBe(200);
    expect((await status('locked')).status).toBe(200);
    expect((await t.call(`${PATH}?rate=20`, { token: viewer.token })).status).toBe(403);
    expect((await status('active')).status).toBe(200);
    const response = await loginOf(t, viewer.user);
    expect(response.status).toBe(200);
    const token = tokenBodySchema.parse(await response.json()).accessToken;
    expect((await t.call(`${PATH}?rate=20`, { token })).status).toBe(200);
  });

  it('does not persist the draft or alter paid money, bank snapshots, agent rate or policy audit', async () => {
    const owner = await affiliateEarning(t);
    const { token, user } = await affiliateAdminToken(t);
    await t.prisma.db.affiliate.update({ where: { id: owner.affiliate.id }, data: AFFILIATE_BANK });
    const paid = await t.call(`/admin/affiliates/${owner.affiliate.id}/payouts`, {
      method: 'POST',
      token,
      headers: { 'Idempotency-Key': randomUUID() },
      json: { monthKey: '2026-09' },
    });
    expect(paid.status).toBe(200);
    const snapshot = () =>
      Promise.all([
        t.prisma.db.affiliatePolicy.findUniqueOrThrow({
          where: { id: 1 },
          select: { defaultRate: true, cookieDays: true, terms: true },
        }),
        t.prisma.db.affiliate.findUniqueOrThrow({
          where: { id: owner.affiliate.id },
          select: { rate: true, bankName: true, bankNo: true, bankHolder: true },
        }),
        t.prisma.db.commission.findUniqueOrThrow({
          where: { id: owner.commission.id },
          select: {
            amount: true,
            listAmount: true,
            rate: true,
            status: true,
            paidAt: true,
            paidBankSnapshot: true,
          },
        }),
        t.prisma.db.auditLog.count({
          where: { actorId: user.id, action: 'affiliate.policy_update' },
        }),
      ]);
    const before = await snapshot();
    expect(before[2]).toMatchObject({
      status: 'paid',
      amount: 120000,
      paidBankSnapshot: AFFILIATE_BANK,
    });
    const response = await t.call(`${PATH}?rate=27`, { token });
    expect(response.status).toBe(200);
    expect(affiliateAdminPolicyPreviewSchema.parse(await response.json()).commission).toBe(162000);
    expect(await snapshot()).toEqual(before);
  });
});
