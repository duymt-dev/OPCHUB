import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ReferralCodeService } from '@/modules/affiliate/services/referral-code.service';
import { AffiliateLifecycleHandler } from '@/modules/affiliate';
import {
  affiliateAdminToken,
  affiliateEarning,
  EARNING_DATE,
} from '../factories/affiliate-admin.factory';
import {
  confirmFee,
  createAffiliate,
  createAffiliateApp,
  createReferral,
} from '../factories/affiliate.factory';
import { planAmount } from '../factories/prices';
import { createUser, flushAuthState } from '../factories/user.factory';
import type { TestApp } from '../setup/test-app';

/** TIP-V42-707: D-94 3A (mọi TV là đại lý), D-110 (cột plan, khôi phục, làm tròn), BR-AFF-REV */
describe('Affiliate cho mọi thành viên (TIP-V42-707)', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createAffiliateApp();
  });
  afterAll(async () => {
    await t.close();
  });
  beforeEach(() => flushAuthState(t));

  it('D-94 3A đăng ký TV mới → đại lý active ngay khi kích hoạt; NĐT không', async () => {
    const email = `${randomUUID()}@test.opchub.vn`;
    const reg = await t.call('/auth/register/personal', {
      method: 'POST',
      json: {
        email,
        fullName: 'Thành viên Đăng ký',
        phone: { country: 'vn', number: '' },
        password: '',
        persona: 'expert',
        groupIds: ['c1'],
        agreeTerms: true,
      },
    });
    expect(reg.status).toBe(202);
    expect(
      (await t.call('/auth/otp/verify', { method: 'POST', json: { email, code: '123456' } }))
        .status,
    ).toBe(200);
    const user = await t.prisma.db.user.findUniqueOrThrow({ where: { email } });
    const a = await t.prisma.db.affiliate.findUniqueOrThrow({ where: { userId: user.id } });
    expect(a.status).toBe('active');
    expect(a.code).toMatch(/^[A-Z]{1,6}OPC\d{2,3}$/);
    // chưa đóng phí (trial) → không có hoa hồng nào
    expect(await t.prisma.db.commission.count({ where: { affiliateId: a.id } })).toBe(0);

    const investor = await createUser(t, { accountType: 'investor', fee: 'active' });
    await t.prisma.db.$transaction((tx) => t.app.get(ReferralCodeService).enroll(tx, investor.id));
    expect(await t.prisma.db.affiliate.count({ where: { userId: investor.id } })).toBe(0);
  });

  it('BR-AFF-REV khách đóng Gói DN lần đầu → khoản plan business, tiền làm tròn đến đồng', async () => {
    const { affiliate } = await createAffiliate(t, EARNING_DATE, 23);
    const customer = await createReferral(t, affiliate.id, affiliate.code, 'business');
    const payload = await confirmFee(t, customer.id, EARNING_DATE, planAmount('business'));
    expect(payload.plan).toBe('business');
    await t.app.get(AffiliateLifecycleHandler).onFeeConfirmed(payload);
    const c = await t.prisma.db.commission.findFirstOrThrow({
      where: { referredUserId: customer.id },
    });
    expect(c).toMatchObject({
      plan: 'business',
      listAmount: planAmount('business'),
      amount: Math.round((planAmount('business') * 23) / 100),
      status: 'recorded',
    });
  });

  it('D-110 khôi phục Đã hủy → Đã ghi nhận + audit; khoản đã chi trả không đổi; id lạ 404', async () => {
    const owner = await affiliateEarning(t);
    const paid = await affiliateEarning(t, owner);
    await t.prisma.db.commission.update({
      where: { id: paid.commission.id },
      data: { status: 'paid', paidAt: new Date() },
    });
    const { token } = await affiliateAdminToken(t);
    const restore = (ids: string[]) =>
      t.call('/admin/affiliate/commissions/restore', { method: 'POST', token, json: { ids } });
    expect(
      (
        await t.call('/admin/affiliate/commissions/cancel', {
          method: 'POST',
          token,
          json: { ids: [owner.commission.id], reason: 'Hủy nhầm' },
        })
      ).status,
    ).toBe(200);
    const res = await restore([owner.commission.id, paid.commission.id]);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ restored: 1 });
    expect(
      await t.prisma.db.commission.findUniqueOrThrow({ where: { id: owner.commission.id } }),
    ).toMatchObject({ status: 'recorded', cancelReason: null, cancelledAt: null });
    expect(
      (await t.prisma.db.commission.findUniqueOrThrow({ where: { id: paid.commission.id } }))
        .status,
    ).toBe('paid');
    expect(
      await t.prisma.db.auditLog.count({
        where: {
          action: 'affiliate.commission_restore',
          entityId: { contains: owner.commission.id },
        },
      }),
    ).toBe(1);
    // lần nữa → không còn khoản Đã hủy
    expect(await (await restore([owner.commission.id])).json()).toEqual({ restored: 0 });
    expect((await restore([randomUUID()])).status).toBe(404);
  });

  it('D-110 đổi % → tính lại làm tròn đến đồng (99.999 × 33% = 33.000, không phải 32.999)', async () => {
    const owner = await affiliateEarning(t);
    await t.prisma.db.commission.update({
      where: { id: owner.commission.id },
      data: { listAmount: 99_999 },
    });
    const { token } = await affiliateAdminToken(t);
    expect(
      (
        await t.call(`/admin/affiliates/${owner.affiliate.id}`, {
          method: 'PATCH',
          token,
          json: { rate: 33 },
        })
      ).status,
    ).toBe(200);
    expect(
      await t.prisma.db.commission.findUniqueOrThrow({ where: { id: owner.commission.id } }),
    ).toMatchObject({ rate: 33, amount: 33_000 });
  });
});
