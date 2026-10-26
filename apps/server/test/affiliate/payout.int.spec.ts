import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { affiliatePayoutResultSchema } from '@opchub/shared/api-domains';
import { apiErrorSchema } from '@opchub/shared/api';
import { parseOutboxPayload } from '@opchub/shared/outbox';
import { AffiliateAdminNotifyHandler } from '@/modules/affiliate';
import { OutboxRelayService } from '@/common/outbox';
import { createAffiliateApp } from '../factories/affiliate.factory';
import {
  AFFILIATE_BANK,
  affiliateAdminToken,
  affiliateEarning,
} from '../factories/affiliate-admin.factory';
import { flushAuthState } from '../factories/user.factory';
import type { TestApp } from '../setup/test-app';

describe('Affiliate payout API (TIP-V2-402)', () => {
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

  it('AT-AF06 thiếu ngân hàng trả 409 và không đổi commission/audit/outbox', async () => {
    const { affiliate, commission, user } = await affiliateEarning(t);
    const { token } = await affiliateAdminToken(t);
    const res = await t.call(`/admin/affiliates/${affiliate.id}/payouts`, {
      method: 'POST',
      token,
      json: { monthKey: '2026-09' },
      headers: { 'Idempotency-Key': randomUUID() },
    });
    expect(res.status).toBe(409);
    const name = await t.prisma.db.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { fullName: true },
    });
    expect(apiErrorSchema.parse(await res.json()).error.message).toBe(
      `${name.fullName} chưa cập nhật số tài khoản`,
    );
    expect(
      (await t.prisma.db.commission.findUniqueOrThrow({ where: { id: commission.id } })).status,
    ).toBe('recorded');
    expect(
      await t.prisma.db.auditLog.count({
        where: { action: 'affiliate.payout', entityId: affiliate.id },
      }),
    ).toBe(0);
    expect(
      await t.prisma.db.outboxEvent.count({
        where: {
          type: 'affiliate.payout_recorded',
          payload: { path: ['affiliateId'], equals: affiliate.id },
        },
      }),
    ).toBe(0);
  });

  it('REQ-309 AT-AF05 paused vẫn chi; snapshot bất biến, retry sau mất cache không trùng', async () => {
    const { affiliate, commission, user } = await affiliateEarning(t);
    await t.prisma.db.affiliate.update({
      where: { id: affiliate.id },
      data: { ...AFFILIATE_BANK, status: 'paused' },
    });
    const { token, user: admin } = await affiliateAdminToken(t, {
      adminPermissions: ['affiliate.view', 'affiliate.payout'],
    });
    const key = randomUUID();
    const pay = () =>
      t.call(`/admin/affiliates/${affiliate.id}/payouts`, {
        method: 'POST',
        token,
        json: { monthKey: '2026-09' },
        headers: { 'Idempotency-Key': key },
      });
    const res = await pay();
    expect(res.status).toBe(200);
    expect(affiliatePayoutResultSchema.parse(await res.json())).toEqual({
      paid: 1,
      amount: 240000,
    });
    await flushAuthState(t);
    expect(affiliatePayoutResultSchema.parse(await (await pay()).json())).toEqual({
      paid: 1,
      amount: 240000,
    });
    const row = await t.prisma.db.commission.findUniqueOrThrow({ where: { id: commission.id } });
    expect(row).toMatchObject({
      status: 'paid',
      paidBy: admin.id,
      paidBankSnapshot: AFFILIATE_BANK,
    });
    expect(
      await t.prisma.db.auditLog.count({
        where: { action: 'affiliate.payout', entityId: affiliate.id },
      }),
    ).toBe(1);
    await t.prisma.db.affiliate.update({
      where: { id: affiliate.id },
      data: { bankNo: '99999999' },
    });
    const event = await t.prisma.db.outboxEvent.findFirstOrThrow({
      where: {
        type: 'affiliate.payout_recorded',
        payload: { path: ['affiliateId'], equals: affiliate.id },
      },
    });
    const relay = t.app.get(OutboxRelayService);
    for (let i = 0; i < 30; i++) {
      await relay.relayOnce();
      if (
        await t.prisma.db.notification.count({
          where: { userId: user.id, title: { startsWith: 'Đã chi trả' } },
        })
      )
        break;
    }
    const handler = t.app.get(AffiliateAdminNotifyHandler);
    await handler.payout(parseOutboxPayload('affiliate.payout_recorded', event.payload));
    const notices = await t.prisma.db.notification.findMany({
      where: { userId: user.id, title: { startsWith: 'Đã chi trả' } },
    });
    expect(notices).toHaveLength(1);
    expect(notices[0]?.body).toContain(AFFILIATE_BANK.bankNo);
    expect(notices[0]?.title).toContain('240.000đ');
    expect(
      (await t.prisma.db.outboxEvent.findUniqueOrThrow({ where: { id: event.id } })).dispatchedAt,
    ).not.toBeNull();
  });

  it('REQ-309 quyền admin không chi, kế toán chi; hai key cạnh tranh chỉ một giao dịch thắng', async () => {
    const { affiliate } = await affiliateEarning(t);
    await t.prisma.db.affiliate.update({ where: { id: affiliate.id }, data: AFFILIATE_BANK });
    const admin = await affiliateAdminToken(t, { systemRole: 'admin' });
    const accountant = await affiliateAdminToken(t, {
      adminPermissions: ['affiliate.view', 'affiliate.payout'],
    });
    const pay = (token: string) =>
      t.call(`/admin/affiliates/${affiliate.id}/payouts`, {
        method: 'POST',
        token,
        json: { monthKey: '2026-09' },
        headers: { 'Idempotency-Key': randomUUID() },
      });
    expect((await pay(admin.token)).status).toBe(403);
    const results = await Promise.all([pay(accountant.token), pay(accountant.token)]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(
      await t.prisma.db.auditLog.count({
        where: { action: 'affiliate.payout', entityId: affiliate.id },
      }),
    ).toBe(1);
  });

  it('D-63 từ chối tháng hiện tại/tương lai, tháng rỗng, id lạ, input lỗi và thiếu key', async () => {
    const { affiliate } = await affiliateEarning(t);
    await t.prisma.db.affiliate.update({ where: { id: affiliate.id }, data: AFFILIATE_BANK });
    const { token } = await affiliateAdminToken(t);
    const currentMonth = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 7);
    for (const monthKey of [currentMonth, '9999-12', '2020-01']) {
      expect(
        (
          await t.call(`/admin/affiliates/${affiliate.id}/payouts`, {
            method: 'POST',
            token,
            json: { monthKey },
            headers: { 'Idempotency-Key': randomUUID() },
          })
        ).status,
      ).toBe(409);
    }
    expect(
      (
        await t.call('/admin/affiliates/missing/payouts', {
          method: 'POST',
          token,
          json: { monthKey: '2026-09' },
          headers: { 'Idempotency-Key': randomUUID() },
        })
      ).status,
    ).toBe(404);
    for (const json of [{ monthKey: '2026-13' }, { monthKey: '2026-09' }]) {
      expect(
        (await t.call(`/admin/affiliates/${affiliate.id}/payouts`, { method: 'POST', token, json }))
          .status,
      ).toBe(400);
    }
    expect(
      (
        await t.call(`/admin/affiliates/${affiliate.id}/payouts`, {
          method: 'POST',
          token,
          json: { monthKey: 'A'.repeat(800000) },
        })
      ).status,
    ).toBe(413);
  });
});
