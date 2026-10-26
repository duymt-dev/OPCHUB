import { afterAll, beforeAll, describe, it } from 'vitest';
import {
  affiliateAdminCustomersSchema,
  affiliateAdminPageSchema,
  affiliateCancelResultSchema,
  affiliateCommissionsSchema,
  affiliateDetailSchema,
  affiliateMonthsSchema,
  affiliatePayoutResultSchema,
  affiliatePolicySchema,
  affiliateRateResultSchema,
  affiliateSummarySchema,
  csvFileSchema,
} from '@opchub/shared/api-domains';
import { createAffiliateApp } from '../factories/affiliate.factory';
import {
  AFFILIATE_BANK,
  affiliateAdminToken,
  affiliateEarning,
} from '../factories/affiliate-admin.factory';
import { flushAuthState } from '../factories/user.factory';
import type { TestApp } from '../setup/test-app';
import { ep } from './harness';

describe('Contract: Affiliate Admin (TIP-V2-402)', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createAffiliateApp();
    await flushAuthState(t);
  });
  afterAll(async () => {
    await t.close();
  });

  it('14 Admin endpoints parse đúng schema shared trên app thật', async () => {
    const owner = await affiliateEarning(t);
    const cancelled = await affiliateEarning(t, owner);
    await t.prisma.db.affiliate.update({ where: { id: owner.affiliate.id }, data: AFFILIATE_BANK });
    const { token } = await affiliateAdminToken(t);
    await ep(
      t,
      'GET',
      '/admin/affiliate/summary',
      '/admin/affiliate/summary?month=2026-09',
      affiliateSummarySchema,
      { token },
    );
    await ep(
      t,
      'GET',
      '/admin/affiliate/commissions',
      '/admin/affiliate/commissions',
      affiliateCommissionsSchema,
      { token },
    );
    await ep(t, 'GET', '/admin/affiliates', '/admin/affiliates', affiliateAdminPageSchema, {
      token,
    });
    await ep(
      t,
      'GET',
      '/admin/affiliates/:id',
      `/admin/affiliates/${owner.affiliate.id}`,
      affiliateDetailSchema,
      { token },
    );
    await ep(
      t,
      'GET',
      '/admin/affiliates/:id/months',
      `/admin/affiliates/${owner.affiliate.id}/months`,
      affiliateMonthsSchema,
      { token },
    );
    await ep(
      t,
      'GET',
      '/admin/affiliates/:id/customers',
      `/admin/affiliates/${owner.affiliate.id}/customers`,
      affiliateAdminCustomersSchema,
      { token },
    );
    await ep(
      t,
      'PUT',
      '/admin/affiliates/rate',
      '/admin/affiliates/rate',
      affiliateRateResultSchema,
      { token, json: { ids: [owner.affiliate.id], rate: 25 } },
    );
    await ep(
      t,
      'PATCH',
      '/admin/affiliates/:id',
      `/admin/affiliates/${owner.affiliate.id}`,
      affiliateRateResultSchema,
      { token, json: { rate: 30 } },
    );
    await ep(
      t,
      'POST',
      '/admin/affiliate/commissions/cancel',
      '/admin/affiliate/commissions/cancel',
      affiliateCancelResultSchema,
      { token, json: { ids: [cancelled.commission.id], reason: 'Đối soát thử nghiệm' } },
    );
    await ep(
      t,
      'POST',
      '/admin/affiliate/commissions/export',
      '/admin/affiliate/commissions/export',
      csvFileSchema,
      { token, json: { ids: [owner.commission.id] } },
    );
    await ep(t, 'POST', '/admin/affiliates/export', '/admin/affiliates/export', csvFileSchema, {
      token,
      json: { ids: [owner.affiliate.id] },
    });
    await ep(
      t,
      'POST',
      '/admin/affiliates/:id/payouts',
      `/admin/affiliates/${owner.affiliate.id}/payouts`,
      affiliatePayoutResultSchema,
      { token, json: { monthKey: '2026-09' } },
    );
    const policy = await ep(
      t,
      'GET',
      '/admin/affiliate/policy',
      '/admin/affiliate/policy',
      affiliatePolicySchema,
      { token },
    );
    await ep(
      t,
      'PUT',
      '/admin/affiliate/policy',
      '/admin/affiliate/policy',
      affiliatePolicySchema,
      { token, json: policy.data },
    );
  });
});
