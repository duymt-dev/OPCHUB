import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  affiliateCommissionsSchema,
  affiliateAdminPageSchema,
  affiliateSummarySchema,
  affiliateReferralsSchema,
  csvFileSchema,
} from '@opchub/shared/api-domains';
import { parseOutboxPayload } from '@opchub/shared/outbox';
import { AffiliateAdminNotifyHandler } from '@/modules/affiliate';
import { createAffiliateApp } from '../factories/affiliate.factory';
import {
  affiliateAdminToken,
  affiliateEarning,
  relayAffiliateEvent,
} from '../factories/affiliate-admin.factory';
import { flushAuthState } from '../factories/user.factory';
import { tokenOf } from '../factories/group.factory';
import type { TestApp } from '../setup/test-app';

describe('Affiliate Admin commissions (TIP-V2-402)', () => {
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

  it('REQ-308 % đơn/bulk chỉ tính lại recorded, paid/cancelled bất biến; notice retry một lần', async () => {
    const owner = await affiliateEarning(t);
    const second = await affiliateEarning(t, owner);
    const paid = await affiliateEarning(t, owner);
    const cancelled = await affiliateEarning(t, owner);
    await t.prisma.db.commission.update({
      where: { id: paid.commission.id },
      data: {
        status: 'paid',
        paidAt: new Date(),
        paidBankSnapshot: { bankName: 'ACB', bankNo: '0123456789', bankHolder: 'NGUYEN VAN AN' },
      },
    });
    await t.prisma.db.commission.update({
      where: { id: cancelled.commission.id },
      data: { status: 'cancelled', cancelReason: 'Fixture cancelled', cancelledAt: new Date() },
    });
    const { token } = await affiliateAdminToken(t);
    const patch = await t.call(`/admin/affiliates/${owner.affiliate.id}`, {
      method: 'PATCH',
      token,
      json: { rate: 30 },
    });
    expect(patch.status).toBe(200);
    for (const id of [owner.commission.id, second.commission.id]) {
      expect(await t.prisma.db.commission.findUniqueOrThrow({ where: { id } })).toMatchObject({
        rate: 30,
        amount: 360000,
      });
    }
    for (const id of [paid.commission.id, cancelled.commission.id]) {
      expect(await t.prisma.db.commission.findUniqueOrThrow({ where: { id } })).toMatchObject({
        rate: 20,
        amount: 240000,
      });
    }
    const event = await t.prisma.db.outboxEvent.findFirstOrThrow({
      where: {
        type: 'affiliate.rate_changed',
        payload: { path: ['affiliateIds'], array_contains: [owner.affiliate.id] },
      },
    });
    await relayAffiliateEvent(t, event.id);
    const handler = t.app.get(AffiliateAdminNotifyHandler);
    const payload = parseOutboxPayload('affiliate.rate_changed', event.payload);
    await handler.rateChanged(payload);
    await handler.rateChanged(payload);
    expect(
      await t.prisma.db.notification.count({
        where: { userId: owner.user.id, title: 'Tỷ lệ hoa hồng của bạn đổi thành 30%' },
      }),
    ).toBe(1);
    const another = await affiliateEarning(t);
    const bulk = await t.call('/admin/affiliates/rate', {
      method: 'PUT',
      token,
      json: { ids: [owner.affiliate.id, another.affiliate.id, another.affiliate.id], rate: 23 },
    });
    expect(bulk.status).toBe(200);
    expect(await bulk.json()).toEqual({ updated: 2 });
    expect(
      (await t.prisma.db.commission.findUniqueOrThrow({ where: { id: another.commission.id } }))
        .amount,
    ).toBe(276000);
    expect(
      await t.prisma.db.auditLog.count({
        where: { action: 'affiliate.rate_change', entityId: owner.affiliate.id },
      }),
    ).toBe(1);
  });

  it('REQ-310 hủy có lý do/audit/notice; paid bỏ qua, retry không báo lại', async () => {
    const owner = await affiliateEarning(t);
    const paid = await affiliateEarning(t, owner);
    await t.prisma.db.commission.update({
      where: { id: paid.commission.id },
      data: {
        status: 'paid',
        paidAt: new Date(),
        paidBankSnapshot: { bankName: 'ACB', bankNo: '0123456789', bankHolder: 'NGUYEN VAN AN' },
      },
    });
    const { token } = await affiliateAdminToken(t);
    const cancel = () =>
      t.call('/admin/affiliate/commissions/cancel', {
        method: 'POST',
        token,
        json: { ids: [owner.commission.id, paid.commission.id], reason: 'Đăng ký không hợp lệ' },
      });
    expect(await (await cancel()).json()).toEqual({ cancelled: 1 });
    expect(await (await cancel()).json()).toEqual({ cancelled: 0 });
    expect(
      await t.prisma.db.commission.findUniqueOrThrow({ where: { id: owner.commission.id } }),
    ).toMatchObject({ status: 'cancelled', cancelReason: 'Đăng ký không hợp lệ' });
    expect(
      (await t.prisma.db.commission.findUniqueOrThrow({ where: { id: paid.commission.id } }))
        .status,
    ).toBe('paid');
    const events = await t.prisma.db.outboxEvent.findMany({
      where: {
        type: 'affiliate.commission_cancelled',
        payload: { path: ['commissionIds'], array_contains: [owner.commission.id] },
      },
    });
    expect(events).toHaveLength(1);
    const event = events[0];
    if (!event) throw new Error('Missing cancellation outbox');
    await relayAffiliateEvent(t, event.id);
    const handler = t.app.get(AffiliateAdminNotifyHandler);
    await handler.cancelled(parseOutboxPayload('affiliate.commission_cancelled', event.payload));
    await handler.cancelled(parseOutboxPayload('affiliate.commission_cancelled', event.payload));
    const notices = await t.prisma.db.notification.findMany({
      where: { userId: owner.user.id, title: 'Hoa hồng đã bị hủy' },
    });
    expect(notices).toHaveLength(1);
    expect(notices[0]?.body).toContain('Đăng ký không hợp lệ');
    const portal = affiliateReferralsSchema.parse(
      await (
        await t.call('/me/affiliate/referrals', {
          token: await tokenOf(t, owner.user),
        })
      ).json(),
    );
    expect(portal.items.find((r) => r.status === 'cancelled')?.cancelReason).toBe(
      'Đăng ký không hợp lệ',
    );
    const admin = affiliateCommissionsSchema.parse(
      await (
        await t.call(`/admin/affiliate/commissions?q=${owner.affiliate.code}&status=cancelled`, {
          token,
        })
      ).json(),
    );
    expect(admin.items.find((r) => r.id === owner.commission.id)?.cancelReason).toBe(
      'Đăng ký không hợp lệ',
    );
    expect(
      await t.prisma.db.auditLog.count({
        where: {
          action: 'affiliate.commission_cancel',
          entityId: `${owner.commission.id},${paid.commission.id}`,
        },
      }),
    ).toBe(2);
  });

  it('REQ-311 tìm mã/tên không dấu, phân trang, CSV có BOM/audit và không thực thi công thức', async () => {
    const owner = await affiliateEarning(t);
    await t.prisma.db.user.update({
      where: { id: owner.user.id },
      data: { fullName: '=SUM(1,2)' },
    });
    await t.prisma.db.user.update({
      where: { id: owner.customer.id },
      data: { fullName: 'Nguyễn Trà My' },
    });
    const { token } = await affiliateAdminToken(t);
    const page = affiliateCommissionsSchema.parse(
      await (
        await t.call('/admin/affiliate/commissions?q=Nguyen%20Tra%20My&size=1', { token })
      ).json(),
    );
    expect(page.items.map((c) => c.id)).toContain(owner.commission.id);
    expect(page.items[0]?.customerName).toBe('Nguyễn Trà My');
    const agents = affiliateAdminPageSchema.parse(
      await (await t.call(`/admin/affiliates?q=${owner.affiliate.code}`, { token })).json(),
    );
    expect(agents.items.map((a) => a.id)).toContain(owner.affiliate.id);
    for (const [url, ids] of [
      ['/admin/affiliate/commissions/export', [owner.commission.id]],
      ['/admin/affiliates/export', [owner.affiliate.id]],
    ] as const) {
      const res = await t.call(url, { method: 'POST', token, json: { ids } });
      expect(res.status).toBe(200);
      const file = csvFileSchema.parse(await res.json());
      expect(file.csv.startsWith('\uFEFF')).toBe(true);
      expect(file.csv).toContain("'=SUM(1,2)");
      expect(
        await t.prisma.db.auditLog.count({
          where: { action: 'affiliate.export', entityId: ids.join(',') },
        }),
      ).toBe(1);
    }
  });

  it('REQ-311 KPI loại cancelled, giữ doanh thu/hoa hồng đã chi khi đổi tỷ lệ', async () => {
    const { token } = await affiliateAdminToken(t);
    const summary = async () =>
      affiliateSummarySchema.parse(
        await (await t.call('/admin/affiliate/summary?month=2001-02', { token })).json(),
      );
    const before = await summary();
    const owner = await affiliateEarning(t);
    const paid = await affiliateEarning(t, owner);
    const cancelled = await affiliateEarning(t, owner);
    await t.prisma.db.commission.updateMany({
      where: { affiliateId: owner.affiliate.id },
      data: { monthKey: '2001-02' },
    });
    await t.prisma.db.commission.update({
      where: { id: paid.commission.id },
      data: { status: 'paid', paidAt: new Date() },
    });
    expect(
      (
        await t.call('/admin/affiliate/commissions/cancel', {
          method: 'POST',
          token,
          json: { ids: [cancelled.commission.id], reason: 'Đối soát KPI' },
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await t.call(`/admin/affiliates/${owner.affiliate.id}`, {
          method: 'PATCH',
          token,
          json: { rate: 30 },
        })
      ).status,
    ).toBe(200);
    const after = await summary();
    expect(after).toEqual({
      revenue: before.revenue + 2400000,
      totalCommission: before.totalCommission + 600000,
      payable: before.payable + 360000,
      paid: before.paid + 240000,
      netRevenue: before.netRevenue + 1800000,
      // BR-AFF-REV (TIP-V42-707): đếm khoản hợp lệ theo gói (khoản Đã hủy không tính)
      plans: { ...before.plans, personal: before.plans.personal + 2 },
    });
  });

  it('D-63 mọi mutation rate/cancel/export: input, 403 chỉ xem, id lạ và body quá lớn', async () => {
    const owner = await affiliateEarning(t);
    const viewer = await affiliateAdminToken(t, { adminPermissions: ['affiliate.view'] });
    const { token } = await affiliateAdminToken(t);
    const cases = [
      {
        url: '/admin/affiliates/rate',
        method: 'PUT',
        good: { ids: [owner.affiliate.id], rate: 30 },
        bad: { ids: [], rate: 51 },
        missing: { ids: ['missing'], rate: 30 },
      },
      {
        url: `/admin/affiliates/${owner.affiliate.id}`,
        method: 'PATCH',
        good: { rate: 30 },
        bad: { rate: 0 },
        missing: null,
      },
      {
        url: '/admin/affiliate/commissions/cancel',
        method: 'POST',
        good: { ids: [owner.commission.id], reason: 'Lý do' },
        bad: { ids: [owner.commission.id], reason: ' ' },
        missing: { ids: ['missing'], reason: 'Lý do' },
      },
      {
        url: '/admin/affiliate/commissions/export',
        method: 'POST',
        good: { ids: [owner.commission.id] },
        bad: { ids: [] },
        missing: { ids: ['missing'] },
      },
      {
        url: '/admin/affiliates/export',
        method: 'POST',
        good: { ids: [owner.affiliate.id] },
        bad: { ids: [] },
        missing: { ids: ['missing'] },
      },
    ];
    for (const c of cases) {
      expect(
        (await t.call(c.url, { method: c.method, token: viewer.token, json: c.good })).status,
      ).toBe(403);
      expect((await t.call(c.url, { method: c.method, token, json: c.bad })).status).toBe(400);
      if (c.missing)
        expect((await t.call(c.url, { method: c.method, token, json: c.missing })).status).toBe(
          404,
        );
      expect(
        (
          await t.call(c.url, {
            method: c.method,
            token,
            json: { ...c.good, extra: 'x'.repeat(800000) },
          })
        ).status,
      ).toBe(413);
    }
    expect(
      (await t.call('/admin/affiliates/missing', { method: 'PATCH', token, json: { rate: 30 } }))
        .status,
    ).toBe(404);
  });
});
