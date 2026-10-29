import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AffiliateLifecycleHandler } from '@/modules/affiliate';
import {
  confirmFee,
  createAffiliate,
  createAffiliateApp,
  createReferral,
} from '../factories/affiliate.factory';
import type { TestApp } from '../setup/test-app';

const NOW = new Date('2026-10-01T01:00:00Z');

/** D-110 (TIP-V42-707): mã luôn hoạt động — thay AF-R07 / AT-AF05 "hết phí → tạm dừng" */
describe('Affiliate — mã luôn hoạt động bất kể phí đại lý (D-110)', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createAffiliateApp();
  });
  afterAll(async () => {
    await t.close();
  });

  const status = async (id: string) =>
    (await t.prisma.db.affiliate.findUniqueOrThrow({ where: { id } })).status;

  it('D-110 đại lý hết phí → vẫn active; khách đóng phí đầu → ghi hoa hồng, không void', async () => {
    const { affiliate, user } = await createAffiliate(t, NOW);
    const handler = t.app.get(AffiliateLifecycleHandler);
    await t.prisma.db.membershipFee.update({
      where: { userId: user.id },
      data: { status: 'expired', validUntil: NOW },
    });
    const next = await createReferral(t, affiliate.id, affiliate.code);
    await handler.onFeeConfirmed(await confirmFee(t, next.id, NOW));
    expect(await status(affiliate.id)).toBe('active');
    expect(
      (await t.prisma.db.referral.findUniqueOrThrow({ where: { referredUserId: next.id } })).status,
    ).toBe('converted');
    expect(await t.prisma.db.commission.count({ where: { referredUserId: next.id } })).toBe(1);
  });

  it('D-110 valid_until đã qua (sweep chưa chạy) vẫn ghi hoa hồng; phát lại không ghi trùng', async () => {
    const { affiliate, user } = await createAffiliate(t, NOW);
    await t.prisma.db.membershipFee.update({
      where: { userId: user.id },
      data: { validUntil: new Date(NOW.getTime() - 1) },
    });
    const next = await createReferral(t, affiliate.id, affiliate.code);
    const payload = await confirmFee(t, next.id, NOW);
    const handler = t.app.get(AffiliateLifecycleHandler);
    await handler.onFeeConfirmed(payload);
    await handler.onFeeConfirmed(payload);
    expect(await t.prisma.db.commission.count({ where: { affiliateId: affiliate.id } })).toBe(1);
    expect(await status(affiliate.id)).toBe('active');
  });
});
