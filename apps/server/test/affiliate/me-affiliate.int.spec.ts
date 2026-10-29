import { randomUUID } from 'node:crypto';
import { apiErrorSchema } from '@opchub/shared/api';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  affiliateBankSchema,
  affiliatePayoutsSchema,
  affiliateReferralsSchema,
  myAffiliateSchema,
} from '@opchub/shared/api-domains';
import { AffiliateLifecycleHandler } from '@/modules/affiliate';
import {
  confirmFee,
  createAffiliate,
  createAffiliateApp,
  createReferral,
} from '../factories/affiliate.factory';
import { createUser, flushAuthState, loginOf, tokenBodySchema } from '../factories/user.factory';
import { FUNDRAISING_PLAN, planAmount } from '../factories/prices';
import type { TestApp } from '../setup/test-app';

const BANK = { bankName: 'Vietcombank', bankNo: '012345678901', bankHolder: 'Nguyễn  Văn An' };
describe('Affiliate Portal API (TIP-V2-402)', () => {
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
  const tokenOf = async (u: Awaited<ReturnType<typeof createUser>>) =>
    tokenBodySchema.parse(await (await loginOf(t, u)).json()).accessToken;

  it('REQ-302 chưa đóng phí vẫn GET được khung locked, không lộ mã/link', async () => {
    const user = await createUser(t, { fee: 'pending_payment' });
    const token = await tokenOf(user);
    const res = await t.call('/me/affiliate', { token });
    expect(res.status).toBe(200);
    expect(myAffiliateSchema.parse(await res.json())).toEqual({
      state: 'locked',
      // BR-AFF-REV (TIP-V42-707): mức theo từng gói — 20% Cá nhân / DN, % Gói Gọi vốn riêng (10)
      policy: {
        rate: 20,
        perAmount: Math.round(planAmount('personal') * 0.2),
        bizAmount: Math.round(planAmount('business') * 0.2),
        fundAmount: Math.round(FUNDRAISING_PLAN.amount * 0.1),
        fundRate: 10,
        cookieDays: 30,
      },
    });
    expect((await t.call('/me/affiliate/bank', { method: 'PUT', token, json: BANK })).status).toBe(
      409,
    );
  });

  it('REQ-309 STK chuẩn hoá in hoa không dấu, giới hạn ngân hàng/số TK/tên; không ghi chéo user', async () => {
    const { user, affiliate } = await createAffiliate(t, new Date());
    const token = await tokenOf(user);
    const res = await t.call('/me/affiliate/bank', {
      method: 'PUT',
      token,
      json: { ...BANK, userId: 'm1' },
    });
    expect(res.status).toBe(200);
    expect(affiliateBankSchema.parse(await res.json())).toEqual({
      ...BANK,
      bankHolder: 'NGUYEN VAN AN',
    });
    const row = await t.prisma.db.affiliate.findUniqueOrThrow({ where: { id: affiliate.id } });
    expect(row.bankHolder).toBe('NGUYEN VAN AN');
    for (const patch of [
      { bankName: 'Ngân hàng lạ' },
      { bankNo: '123ab' },
      { bankHolder: 'AN 123' },
      { bankNo: '1'.repeat(20) },
    ]) {
      const bad = await t.call('/me/affiliate/bank', {
        method: 'PUT',
        token,
        json: { ...BANK, ...patch },
      });
      expect(bad.status).toBe(400);
      const error = apiErrorSchema.parse(await bad.json()).error;
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.fields?.length).toBeGreaterThan(0);
    }
    expect((await t.call('/me/affiliate/bank', { method: 'PUT', json: BANK })).status).toBe(401);
    const huge = await t.call('/me/affiliate/bank', {
      method: 'PUT',
      token,
      json: { ...BANK, bankHolder: 'A'.repeat(800000) },
    });
    expect(huge.status).toBe(413);
  });

  it('REQ-311 thống kê tiền nguyên + referral lọc tháng/phân trang, tên rút gọn và cô lập dữ liệu', async () => {
    const now = new Date();
    const { user, affiliate } = await createAffiliate(t, now);
    const customer = await createReferral(t, affiliate.id, affiliate.code);
    await t.app
      .get(AffiliateLifecycleHandler)
      .onFeeConfirmed(await confirmFee(t, customer.id, now));
    const token = await tokenOf(user);
    const mine = myAffiliateSchema.parse(await (await t.call('/me/affiliate', { token })).json());
    expect(mine.state).toBe('active');
    if (mine.state === 'locked') throw new Error('Unexpected locked affiliate');
    expect(mine.stats).toMatchObject({
      paidCount: 1,
      thisMonth: 240000,
      carryOver: 0,
      received: 0,
    });
    expect(mine.link).toContain(`/r/${affiliate.code}`);
    const month = new Date(now.getTime() + 7 * 3600_000).toISOString().slice(0, 7);
    const list = affiliateReferralsSchema.parse(
      await (await t.call(`/me/affiliate/referrals?month=${month}&size=1`, { token })).json(),
    );
    expect(list.total).toBe(1);
    expect(list.items).toHaveLength(1);
    expect(list.items[0]).toMatchObject({
      commission: 240000,
      status: 'recorded',
      feeAmount: 1200000,
    });
    expect(list.items[0]?.name).toMatch(/\.$/);
    const empty = affiliateReferralsSchema.parse(
      await (
        await t.call(`/me/affiliate/referrals?month=${month}&page=2&size=1`, { token })
      ).json(),
    );
    expect(empty).toMatchObject({ items: [], total: 1 });
    const other = await createAffiliate(t, now);
    expect(
      affiliateReferralsSchema.parse(
        await (
          await t.call('/me/affiliate/referrals', { token: await tokenOf(other.user) })
        ).json(),
      ).items,
    ).toEqual([]);
    expect(
      affiliatePayoutsSchema.parse(await (await t.call('/me/affiliate/payouts', { token })).json())
        .items,
    ).toEqual([]);
    const invalid = await t.call('/me/affiliate/referrals?month=2026-13', { token });
    expect(invalid.status).toBe(400);
  });

  it('REQ-309 D-110 đại lý hết phí vẫn active, cập nhật STK được', async () => {
    const { user } = await createAffiliate(t, new Date());
    const token = await tokenOf(user);
    await t.prisma.db.membershipFee.update({
      where: { userId: user.id },
      data: { status: 'expired', validUntil: new Date('2020-01-01') },
    });
    expect(
      myAffiliateSchema.parse(await (await t.call('/me/affiliate', { token })).json()).state,
    ).toBe('active');
    expect(
      (
        await t.call('/me/affiliate/bank', {
          method: 'PUT',
          token,
          json: BANK,
          headers: { 'Idempotency-Key': randomUUID() },
        })
      ).status,
    ).toBe(200);
  });
});
