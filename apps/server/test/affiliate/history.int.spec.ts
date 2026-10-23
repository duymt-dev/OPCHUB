import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  affiliateAdminCustomersSchema,
  affiliateMonthsSchema,
  affiliatePayoutsSchema,
  affiliateReferralsSchema,
} from '@opchub/shared/api-domains';
import { AffiliateNotifyHandler } from '@/modules/affiliate';
import { PayoutService } from '@/modules/affiliate/services/payout.service';
import { createAffiliateApp } from '../factories/affiliate.factory';
import {
  AFFILIATE_BANK,
  affiliateAdminToken,
  affiliateEarning,
} from '../factories/affiliate-admin.factory';
import { flushAuthState, loginOf, tokenBodySchema } from '../factories/user.factory';
import type { TestApp } from '../setup/test-app';

describe('Affiliate history API (TIP-V2-402)', () => {
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

  it('REQ-311 tên khách đã xóa không lộ qua Portal, Admin hay thông báo', async () => {
    const owner = await affiliateEarning(t);
    await t.prisma.db.user.update({
      where: { id: owner.customer.id },
      data: {
        deletedAt: new Date(),
        fullName: 'Tên riêng không được lộ',
      },
    });
    const token = tokenBodySchema.parse(await (await loginOf(t, owner.user)).json()).accessToken;
    const list = affiliateReferralsSchema.parse(
      await (await t.call('/me/affiliate/referrals', { token })).json(),
    );
    expect(list.items[0]?.name).toBe('Thành viên đã xóa');
    const admin = await affiliateAdminToken(t);
    const customers = affiliateAdminCustomersSchema.parse(
      await (
        await t.call(`/admin/affiliates/${owner.affiliate.id}/customers`, { token: admin.token })
      ).json(),
    );
    expect(customers.items[0]?.name).toBe('Thành viên đã xóa');
    await t.app.get(AffiliateNotifyHandler).recorded({ commissionId: owner.commission.id });
    const notice = await t.prisma.db.notification.findUniqueOrThrow({
      where: { id: `affiliate:commission:${owner.commission.id}` },
    });
    expect(notice.title).toContain('Thành viên đã xóa');
    expect(notice.title).not.toContain('Tên riêng');
  });

  it('REQ-309/311 hai receipt cùng tháng/ngày/ngân hàng không gộp nhầm, history giữ snapshot', async () => {
    const owner = await affiliateEarning(t);
    await t.prisma.db.affiliate.update({ where: { id: owner.affiliate.id }, data: AFFILIATE_BANK });
    const admin = await affiliateAdminToken(t);
    const actor = { id: admin.user.id, ip: null };
    const now = new Date('2026-10-01T01:00:00Z');
    const pay = () =>
      t.app.get(PayoutService).record(actor, owner.affiliate.id, '2026-09', randomUUID(), now);
    await pay();
    await affiliateEarning(t, owner);
    await pay();
    await t.prisma.db.affiliate.update({
      where: { id: owner.affiliate.id },
      data: { bankNo: '99999999' },
    });
    const token = tokenBodySchema.parse(await (await loginOf(t, owner.user)).json()).accessToken;
    const list = affiliatePayoutsSchema.parse(
      await (await t.call('/me/affiliate/payouts?size=1', { token })).json(),
    );
    expect(list.total).toBe(2);
    expect(list.items).toHaveLength(1);
    expect(list.items[0]).toMatchObject({
      monthKey: '2026-09',
      amount: 240000,
      count: 1,
      bank: AFFILIATE_BANK,
    });
    const page2 = affiliatePayoutsSchema.parse(
      await (await t.call('/me/affiliate/payouts?page=2&size=1', { token })).json(),
    );
    expect(page2.items).toHaveLength(1);
    expect(page2.items[0]?.bank).toEqual(AFFILIATE_BANK);
    const months = affiliateMonthsSchema.parse(
      await (
        await t.call(`/admin/affiliates/${owner.affiliate.id}/months`, { token: admin.token })
      ).json(),
    );
    expect(months.items).toHaveLength(1);
    expect(months.items[0]).toMatchObject({
      monthKey: '2026-09',
      customers: 2,
      amount: 480000,
      payable: 0,
      status: 'paid',
    });
    const customers = affiliateAdminCustomersSchema.parse(
      await (
        await t.call(`/admin/affiliates/${owner.affiliate.id}/customers?size=1`, {
          token: admin.token,
        })
      ).json(),
    );
    expect(customers.total).toBe(2);
    expect(customers.items[0]?.bank).toEqual(AFFILIATE_BANK);
  });
});
