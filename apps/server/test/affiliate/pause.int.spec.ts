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

describe('Affiliate tạm dừng / gia hạn (TIP-V2-401)', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createAffiliateApp();
  });
  afterAll(async () => {
    await t.close();
  });

  it('AT-AF05 REQ-307 hết phí → paused, referral void; gia hạn active, không xoá khoản cũ', async () => {
    const { affiliate, user } = await createAffiliate(t, NOW);
    const handler = t.app.get(AffiliateLifecycleHandler);
    const first = await createReferral(t, affiliate.id, affiliate.code);
    await handler.onFeeConfirmed(await confirmFee(t, first.id, NOW));
    await handler.onFeeChanged({
      userId: user.id,
      status: 'expired',
      validUntil: NOW.toISOString(),
    });
    expect(
      (await t.prisma.db.affiliate.findUniqueOrThrow({ where: { id: affiliate.id } })).status,
    ).toBe('paused');
    const next = await createReferral(t, affiliate.id, affiliate.code);
    await handler.onFeeConfirmed(await confirmFee(t, next.id, NOW));
    expect(
      (await t.prisma.db.referral.findUniqueOrThrow({ where: { referredUserId: next.id } })).status,
    ).toBe('void');
    expect(await t.prisma.db.commission.count({ where: { referredUserId: next.id } })).toBe(0);
    await handler.onFeeChanged({
      userId: user.id,
      status: 'active',
      validUntil: '2027-10-01T01:00:00Z',
    });
    expect(
      (await t.prisma.db.affiliate.findUniqueOrThrow({ where: { id: affiliate.id } })).status,
    ).toBe('active');
    expect(await t.prisma.db.commission.count({ where: { affiliateId: affiliate.id } })).toBe(1);
  });

  it('REQ-307 D-57 valid_until hết hạn dù sweep chưa chạy vẫn void, không ghi hoa hồng', async () => {
    const { affiliate, user } = await createAffiliate(t, NOW);
    await t.prisma.db.membershipFee.update({
      where: { userId: user.id },
      data: { validUntil: new Date(NOW.getTime() - 1) },
    });
    const next = await createReferral(t, affiliate.id, affiliate.code);
    await t.app.get(AffiliateLifecycleHandler).onFeeConfirmed(await confirmFee(t, next.id, NOW));
    expect(
      (await t.prisma.db.referral.findUniqueOrThrow({ where: { referredUserId: next.id } })).status,
    ).toBe('void');
    expect(await t.prisma.db.commission.count({ where: { affiliateId: affiliate.id } })).toBe(0);
  });
});
