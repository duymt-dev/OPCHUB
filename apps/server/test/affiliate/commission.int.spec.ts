import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { OutboxRelayService } from '@/common/outbox';
import { AffiliateLifecycleHandler } from '@/modules/affiliate';
import {
  createAffiliate,
  createAffiliateApp,
  createReferral,
  confirmFee,
  deliverCommission,
} from '../factories/affiliate.factory';
import type { TestApp } from '../setup/test-app';

const NOW = new Date('2026-09-30T17:30:00Z');

describe('Affiliate hoa hồng lần đầu (TIP-V2-401)', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createAffiliateApp();
  });
  afterAll(async () => {
    await t.close();
  });

  it('AT-AF02 REQ-306 phí → outbox → relay → hoa hồng 240000 + chuông; retry không trùng', async () => {
    const { affiliate, user } = await createAffiliate(t, NOW);
    const customer = await createReferral(t, affiliate.id, affiliate.code);
    const payload = await confirmFee(t, customer.id, NOW, 900_000);
    const relay = t.app.get(OutboxRelayService);
    // Relay thật, đi qua sự kiện đã ghi cùng transaction của MembershipFeeService.
    for (let i = 0; i < 30; i++) {
      await relay.relayOnce();
      if (await t.prisma.db.notification.count({ where: { userId: user.id, type: 'affiliate' } }))
        break;
    }
    const c = await t.prisma.db.commission.findFirstOrThrow({
      where: { referredUserId: customer.id, source: 'membership' },
    });
    expect(c).toMatchObject({
      amount: 240_000,
      listAmount: 1_200_000,
      rate: 20,
      status: 'recorded',
      monthKey: '2026-10',
    });
    await t.app.get(AffiliateLifecycleHandler).onFeeConfirmed(payload);
    await Promise.all([deliverCommission(t, c.id), deliverCommission(t, c.id)]);
    expect(await t.prisma.db.commission.count({ where: { referredUserId: customer.id } })).toBe(1);
    const notices = await t.prisma.db.notification.findMany({
      where: { userId: user.id, type: 'affiliate' },
    });
    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatchObject({ link: '/affiliate' });
    expect(notices[0]?.body).toContain('240.000đ');
  });

  it('AT-AF04 REQ-305 gia hạn không sinh hoa hồng lần hai; D-53 tháng VN trước nửa đêm', async () => {
    const now = new Date('2026-09-30T16:30:00Z');
    const { affiliate } = await createAffiliate(t, now, 23);
    const customer = await createReferral(t, affiliate.id, affiliate.code);
    const first = await confirmFee(t, customer.id, now);
    const handler = t.app.get(AffiliateLifecycleHandler);
    await handler.onFeeConfirmed(first);
    const renewal = await confirmFee(t, customer.id, new Date('2027-09-30T16:30:00Z'));
    expect(renewal.isFirst).toBe(false);
    await handler.onFeeConfirmed(renewal);
    const commissions = await t.prisma.db.commission.findMany({
      where: { referredUserId: customer.id },
    });
    expect(commissions).toHaveLength(1);
    expect(commissions[0]).toMatchObject({ amount: 276_000, monthKey: '2026-09' });
    await expect(
      t.prisma.db.commission.create({
        data: {
          affiliateId: affiliate.id,
          referredUserId: customer.id,
          feePeriodId: renewal.periodId,
          amount: 240_000,
          listAmount: 1_200_000,
          rate: 20,
          monthKey: '2027-09',
          plan: 'personal',
        },
      }),
    ).rejects.toThrow();
  });
});
