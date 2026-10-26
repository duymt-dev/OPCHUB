import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuditService } from '@/common/audit';
import { CommissionAdminService } from '@/modules/affiliate/services/commission-admin.service';
import { PayoutService } from '@/modules/affiliate/services/payout.service';
import { createAffiliateApp } from '../factories/affiliate.factory';
import {
  AFFILIATE_BANK,
  affiliateAdminToken,
  affiliateEarning,
} from '../factories/affiliate-admin.factory';
import { flushAuthState } from '../factories/user.factory';
import type { TestApp } from '../setup/test-app';

describe('Affiliate mutations atomicity/concurrency (TIP-V2-402)', () => {
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

  it('REQ-308/309 rate tranh payout: toàn bộ khoản cùng tỷ lệ, không pha trộn một kỳ', async () => {
    const owner = await affiliateEarning(t);
    const second = await affiliateEarning(t, owner);
    await t.prisma.db.affiliate.update({ where: { id: owner.affiliate.id }, data: AFFILIATE_BANK });
    const { user } = await affiliateAdminToken(t);
    const actor = { id: user.id, ip: null };
    const [paid] = await Promise.all([
      t.app.get(PayoutService).record(actor, owner.affiliate.id, '2026-09', randomUUID()),
      t.app.get(CommissionAdminService).rate(actor, [owner.affiliate.id], 30),
    ]);
    const rows = await t.prisma.db.commission.findMany({
      where: { id: { in: [owner.commission.id, second.commission.id] } },
    });
    expect(rows.every((r) => r.status === 'paid')).toBe(true);
    expect(new Set(rows.map((r) => r.rate)).size).toBe(1);
    expect([480000, 720000]).toContain(paid.amount);
    expect(rows.reduce((sum, r) => sum + r.amount, 0)).toBe(paid.amount);
    expect(
      (await t.prisma.db.affiliate.findUniqueOrThrow({ where: { id: owner.affiliate.id } })).rate,
    ).toBe(30);
  });

  it('REQ-309/310 cancel tranh payout: trả tiền đúng recorded, không trả khoản đã hủy', async () => {
    const owner = await affiliateEarning(t);
    await affiliateEarning(t, owner);
    await t.prisma.db.affiliate.update({ where: { id: owner.affiliate.id }, data: AFFILIATE_BANK });
    const { user } = await affiliateAdminToken(t);
    const actor = { id: user.id, ip: null };
    const [paid, cancelled] = await Promise.all([
      t.app.get(PayoutService).record(actor, owner.affiliate.id, '2026-09', randomUUID()),
      t.app
        .get(CommissionAdminService)
        .cancel(actor, { ids: [owner.commission.id], reason: 'Đối soát' }),
    ]);
    expect(paid.paid + cancelled.cancelled).toBe(2);
    expect(paid.amount).toBe(paid.paid * 240000);
    const row = await t.prisma.db.commission.findUniqueOrThrow({
      where: { id: owner.commission.id },
    });
    expect(row.status).toBe(cancelled.cancelled ? 'cancelled' : 'paid');
  });

  it('luật 8/10: audit thất bại rollback cả mutation và outbox', async () => {
    const owner = await affiliateEarning(t);
    const { user } = await affiliateAdminToken(t);
    const before = await t.prisma.db.outboxEvent.count({
      where: { type: 'affiliate.rate_changed' },
    });
    const failure = new Error('Test audit unavailable');
    const spy = vi.spyOn(t.app.get(AuditService), 'log').mockRejectedValueOnce(failure);
    try {
      await expect(
        t.app.get(CommissionAdminService).rate({ id: user.id, ip: null }, [owner.affiliate.id], 30),
      ).rejects.toBe(failure);
    } finally {
      spy.mockRestore();
    }
    expect(
      (await t.prisma.db.affiliate.findUniqueOrThrow({ where: { id: owner.affiliate.id } })).rate,
    ).toBe(20);
    expect(
      (await t.prisma.db.commission.findUniqueOrThrow({ where: { id: owner.commission.id } }))
        .amount,
    ).toBe(240000);
    expect(await t.prisma.db.outboxEvent.count({ where: { type: 'affiliate.rate_changed' } })).toBe(
      before,
    );
  });
});
