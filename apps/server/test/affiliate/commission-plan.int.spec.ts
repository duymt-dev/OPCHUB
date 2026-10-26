import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { LEGACY_ANNUAL_FEE } from '@opchub/shared';
import { affiliatePolicySchema } from '@opchub/shared/api-domains';
import { AffiliateLifecycleHandler } from '@/modules/affiliate';
import {
  confirmFee,
  createAffiliate,
  createAffiliateApp,
  createReferral,
} from '../factories/affiliate.factory';
import { affiliateAdminToken } from '../factories/affiliate-admin.factory';
import type { TestApp } from '../setup/test-app';

const NOW = new Date('2026-10-23T03:00:00Z');

/** D-70 (TIP-V4-602): hoa hồng = % × phí gói thực đóng, làm tròn xuống đồng */
describe('Affiliate hoa hồng theo gói (D-70)', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createAffiliateApp();
  });
  afterAll(async () => {
    await t.close();
  });

  const commissionOf = (referredUserId: string) =>
    t.prisma.db.commission.findFirstOrThrow({
      where: { referredUserId, source: 'membership' },
      select: { amount: true, listAmount: true, rate: true, source: true },
    });

  it('REQ-502 Gói Doanh nghiệp 3.600.000 × 20% = 720.000, nguồn membership', async () => {
    const { affiliate } = await createAffiliate(t, NOW);
    const customer = await createReferral(t, affiliate.id, affiliate.code, 'business');
    const payload = await confirmFee(t, customer.id, NOW, 3_600_000);
    expect(payload.listAmount).toBe(3_600_000);
    await t.app.get(AffiliateLifecycleHandler).onFeeConfirmed(payload);
    expect(await commissionOf(customer.id)).toEqual({
      amount: 720_000,
      listAmount: 3_600_000,
      rate: 20,
      source: 'membership',
    });
  });

  it('REQ-502 Gói Cá nhân 1.200.000 × 23% làm tròn xuống = 276.000', async () => {
    const { affiliate } = await createAffiliate(t, NOW, 23);
    const customer = await createReferral(t, affiliate.id, affiliate.code);
    await t.app
      .get(AffiliateLifecycleHandler)
      .onFeeConfirmed(await confirmFee(t, customer.id, NOW, 1_200_000));
    expect(await commissionOf(customer.id)).toMatchObject({
      amount: 276_000,
      listAmount: 1_200_000,
    });
  });

  it('D-69 kỳ cũ còn 600.000 → hoa hồng trên 600.000', async () => {
    const { affiliate } = await createAffiliate(t, NOW);
    const customer = await createReferral(t, affiliate.id, affiliate.code);
    await t.prisma.db.membershipFee.update({
      where: { userId: customer.id },
      data: { amount: LEGACY_ANNUAL_FEE },
    });
    await t.app
      .get(AffiliateLifecycleHandler)
      .onFeeConfirmed(await confirmFee(t, customer.id, NOW, LEGACY_ANNUAL_FEE));
    expect(await commissionOf(customer.id)).toMatchObject({
      amount: 120_000,
      listAmount: LEGACY_ANNUAL_FEE,
    });
  });

  it('Q-V4-602-4 chuyển dư không tăng hoa hồng (cơ sở là phí gói của kỳ)', async () => {
    const { affiliate } = await createAffiliate(t, NOW);
    const customer = await createReferral(t, affiliate.id, affiliate.code);
    await t.app
      .get(AffiliateLifecycleHandler)
      .onFeeConfirmed(await confirmFee(t, customer.id, NOW, 1_500_000));
    expect(await commissionOf(customer.id)).toMatchObject({
      amount: 240_000,
      listAmount: 1_200_000,
    });
  });

  it('D-70 chính sách có % Gọi vốn mặc định 10, sửa được và ghi audit', async () => {
    const { token, user } = await affiliateAdminToken(t);
    const cur = affiliatePolicySchema.parse(
      await (await t.call('/admin/affiliate/policy', { token })).json(),
    );
    expect(cur.fundraisingRate).toBe(10);
    const res = await t.call('/admin/affiliate/policy', {
      method: 'PUT',
      token,
      json: { ...cur, fundraisingRate: 15 },
    });
    expect(res.status).toBe(200);
    expect(affiliatePolicySchema.parse(await res.json()).fundraisingRate).toBe(15);
    const audit = await t.prisma.db.auditLog.findFirstOrThrow({
      where: { actorId: user.id, action: 'affiliate.policy_update' },
      select: { diff: true },
    });
    expect(audit.diff).toMatchObject({ after: { fundraisingRate: 15 } });
    await t.prisma.db.affiliatePolicy.update({ where: { id: 1 }, data: { fundraisingRate: 10 } });
  });

  it('V4-602 route ví dụ hoa hồng theo % đã bỏ → 404', async () => {
    const { token } = await affiliateAdminToken(t);
    expect((await t.call('/admin/affiliate/policy/preview?rate=20', { token })).status).toBe(404);
  });
});
