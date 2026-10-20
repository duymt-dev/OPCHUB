import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { apiErrorSchema } from '@opchub/shared/api';
import { affiliateDetailSchema } from '@opchub/shared/api-domains';
import { createAffiliateApp } from '../factories/affiliate.factory';
import {
  AFFILIATE_BANK,
  affiliateAdminToken,
  affiliateEarning,
} from '../factories/affiliate-admin.factory';
import { flushAuthState, loginOf, tokenBodySchema } from '../factories/user.factory';
import type { TestApp } from '../setup/test-app';

describe('Affiliate guards and error envelopes (TIP-V2-402)', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createAffiliateApp();
  });
  afterAll(async () => {
    await t.close();
  });
  beforeEach(async () => {
    await flushAuthState(t);
  });

  it('REQ-311 mọi Admin GET cần affiliate.view; không lộ ngân hàng sang member/action-only', async () => {
    const owner = await affiliateEarning(t);
    await t.prisma.db.affiliate.update({ where: { id: owner.affiliate.id }, data: AFFILIATE_BANK });
    const member = tokenBodySchema.parse(await (await loginOf(t, owner.user)).json()).accessToken;
    const actionOnly = await affiliateAdminToken(t, { adminPermissions: ['affiliate.action'] });
    const viewer = await affiliateAdminToken(t, { adminPermissions: ['affiliate.view'] });
    const urls = [
      '/admin/affiliate/summary',
      '/admin/affiliate/commissions',
      '/admin/affiliates',
      `/admin/affiliates/${owner.affiliate.id}`,
      `/admin/affiliates/${owner.affiliate.id}/months`,
      `/admin/affiliates/${owner.affiliate.id}/customers`,
      '/admin/affiliate/policy',
    ];
    for (const url of urls) {
      expect((await t.call(url)).status).toBe(401);
      for (const token of [member, actionOnly.token]) {
        const res = await t.call(url, { token });
        expect(res.status).toBe(403);
        const raw = await res.text();
        expect(raw).not.toContain(AFFILIATE_BANK.bankNo);
      }
      expect((await t.call(url, { token: viewer.token })).status).toBe(200);
    }
    const detail = affiliateDetailSchema.parse(
      await (
        await t.call(`/admin/affiliates/${owner.affiliate.id}`, { token: viewer.token })
      ).json(),
    );
    expect(detail.bank).toEqual(AFFILIATE_BANK);
    expect((await t.call('/me/affiliate', { token: viewer.token })).status).toBe(403);
    expect(
      (
        await t.call('/me/affiliate/bank', {
          token: viewer.token,
          method: 'PUT',
          json: AFFILIATE_BANK,
        })
      ).status,
    ).toBe(403);
  });

  it('D-63 mọi body Admin ghi lỗi zod đều 400 VALIDATION_ERROR với fields; chỉ xem trả VIEW_ONLY', async () => {
    const owner = await affiliateEarning(t);
    const viewer = await affiliateAdminToken(t, { adminPermissions: ['affiliate.view'] });
    const admin = await affiliateAdminToken(t);
    const writes = [
      ['PUT', '/admin/affiliates/rate', { ids: [owner.affiliate.id], rate: 0 }],
      ['PATCH', `/admin/affiliates/${owner.affiliate.id}`, { rate: 51 }],
      ['POST', '/admin/affiliate/commissions/cancel', { ids: [owner.commission.id], reason: '' }],
      ['POST', '/admin/affiliate/commissions/export', { ids: [] }],
      ['POST', '/admin/affiliates/export', { ids: [] }],
      ['POST', `/admin/affiliates/${owner.affiliate.id}/payouts`, { monthKey: '2026-13' }],
      ['PUT', '/admin/affiliate/policy', { defaultRate: 0, cookieDays: 0, terms: '' }],
    ] as const;
    for (const [method, url, json] of writes) {
      const invalid = await t.call(url, { method, token: admin.token, json });
      expect(invalid.status).toBe(400);
      const error = apiErrorSchema.parse(await invalid.json()).error;
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.fields?.length).toBeGreaterThan(0);
      const forbidden = await t.call(url, { method, token: viewer.token, json });
      expect(forbidden.status).toBe(403);
      expect(apiErrorSchema.parse(await forbidden.json()).error.code).toBe('VIEW_ONLY');
    }
  });
});
