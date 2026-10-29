import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AffiliateLifecycleHandler } from '@/modules/affiliate';
import {
  createAffiliateApp,
  createAffiliate,
  createReferral,
  confirmFee,
} from '../factories/affiliate.factory';
import type { TestApp } from '../setup/test-app';

const NOW = new Date('2026-09-15T04:00:00Z');
const FUTURE = new Date('2027-09-15T04:00:00Z');

describe('REQ-306 REQ-307 native referral terminal states never reopen on event replay', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createAffiliateApp();
  });
  afterAll(async () => {
    await t.close();
  });
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  async function feeState(userId: string, status: 'active' | 'expired') {
    const validUntil = status === 'active' ? FUTURE : new Date(NOW.getTime() - 1);
    await t.prisma.db.membershipFee.update({ where: { userId }, data: { status, validUntil } });
  }

  it('REQ-306 void referral (dữ liệu cũ trước D-110) không thành converted khi phát lại sự kiện phí đầu', async () => {
    const { affiliate } = await createAffiliate(t, NOW, 20);
    const customer = await createReferral(t, affiliate.id, affiliate.code);
    await t.prisma.db.referral.update({
      where: { referredUserId: customer.id },
      data: { status: 'void' },
    });
    const payload = await confirmFee(t, customer.id, NOW);
    const handler = t.app.get(AffiliateLifecycleHandler);
    await handler.onFeeConfirmed(payload);
    await handler.onFeeConfirmed(payload);
    expect(
      await t.prisma.db.referral.findUniqueOrThrow({
        where: { referredUserId: customer.id },
        select: { status: true },
      }),
    ).toEqual({ status: 'void' });
    expect(await t.prisma.db.commission.count({ where: { referredUserId: customer.id } })).toBe(0);
  });

  it('REQ-307 converted referral cannot become void after owner expires and first-fee event replays', async () => {
    const { affiliate, user } = await createAffiliate(t, NOW, 20);
    const customer = await createReferral(t, affiliate.id, affiliate.code);
    const payload = await confirmFee(t, customer.id, NOW);
    const handler = t.app.get(AffiliateLifecycleHandler);
    await handler.onFeeConfirmed(payload);
    const commission = () =>
      t.prisma.db.commission.findFirstOrThrow({
        where: { referredUserId: customer.id, source: 'membership' },
        select: { status: true, amount: true, rate: true },
      });
    const before = await commission();
    expect(before).toEqual({ status: 'recorded', amount: 240000, rate: 20 });
    await feeState(user.id, 'expired');
    await handler.onFeeConfirmed(payload);
    expect(
      await t.prisma.db.referral.findUniqueOrThrow({
        where: { referredUserId: customer.id },
        select: { status: true },
      }),
    ).toEqual({ status: 'converted' });
    expect(await commission()).toEqual(before);
    expect(await t.prisma.db.commission.count({ where: { referredUserId: customer.id } })).toBe(1);
  });
});
