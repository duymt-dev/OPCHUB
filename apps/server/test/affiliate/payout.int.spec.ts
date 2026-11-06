import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createAffiliateApp } from '../factories/affiliate.factory';
import { affiliateAdminToken, affiliateEarning } from '../factories/affiliate-admin.factory';
import type { TestApp } from '../setup/test-app';
describe('D-119 direct affiliate payout route removed', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createAffiliateApp();
  });
  afterAll(() => t.close());
  it.each(['super_admin', 'accountant'])('REQ-619 route removed even for %s', async (role) => {
    const f = await affiliateEarning(t);
    const { token } = await affiliateAdminToken(t, {
      adminPermissions: ['affiliate.view', 'affiliate.payout'],
    });
    const before = await t.prisma.db.commission.findUniqueOrThrow({
      where: { id: f.commission.id },
    });
    const response = await t.call(`/admin/affiliates/${f.affiliate.id}/payouts`, {
      method: 'POST',
      token,
      json: { monthKey: '2026-09' },
      headers: { 'Idempotency-Key': role },
    });
    expect(response.status).toBe(404);
    expect(
      await t.prisma.db.commission.findUniqueOrThrow({ where: { id: f.commission.id } }),
    ).toEqual(before);
  });
});
