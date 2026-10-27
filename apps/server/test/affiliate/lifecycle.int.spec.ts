import { planAmount } from '../factories/prices';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { OutboxRelayService } from '@/common/outbox';
import { AffiliateLifecycleHandler, AffiliateBackfillService } from '@/modules/affiliate';
import { ReconcileService } from '@/modules/membership-fee';
import { createAffiliateApp, confirmFee } from '../factories/affiliate.factory';
import {
  assignMemberCode,
  createUser,
  flushAuthState,
  loginOf,
  tokenBodySchema,
} from '../factories/user.factory';
import type { TestApp } from '../setup/test-app';

describe('Affiliate tự tạo từ mọi đường xác nhận phí (TIP-V2-401)', () => {
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

  async function relayUntil(userId: string) {
    for (let i = 0; i < 30; i++) {
      await t.app.get(OutboxRelayService).relayOnce();
      const a = await t.prisma.db.affiliate.findUnique({ where: { userId } });
      if (a) return a;
    }
    throw new Error('Không có đại lý sau relay');
  }

  it('AT-AF01 REQ-301 webhook, collect, bulk, match đều tự tạo đúng một đại lý', async () => {
    const admin = await createUser(t, { systemRole: 'admin' });
    const token = tokenBodySchema.parse(await (await loginOf(t, admin)).json()).accessToken;
    for (const mode of ['webhook', 'collect', 'bulk', 'match'] as const) {
      const u = await createUser(t, { fee: 'pending_payment' });
      const code = await assignMemberCode(t, u.id);
      if (mode === 'collect' || mode === 'bulk') {
        const r = await t.call(
          mode === 'bulk' ? '/admin/fees/collect' : `/admin/fees/${u.id}/collect`,
          {
            method: 'POST',
            token,
            ...(mode === 'bulk' ? { json: { userIds: [u.id] } } : {}),
          },
        );
        expect(r.status).toBe(200);
      } else {
        const content = mode === 'webhook' ? `OPCHUB ${code}` : `Affiliate match ${u.id}`;
        expect(
          (
            await t.call('/dev/bank/simulate', {
              method: 'POST',
              json: { amount: planAmount('personal'), content },
            })
          ).status,
        ).toBe(200);
        const txn = await t.prisma.db.paymentTransaction.findFirstOrThrow({
          where: { content },
          select: { id: true },
        });
        if (mode === 'webhook') await t.app.get(ReconcileService).match(txn.id);
        else
          expect(
            (
              await t.call(`/admin/fees/transactions/${txn.id}/match`, {
                method: 'POST',
                token,
                json: { userId: u.id, reason: 'Đối soát affiliate' },
              })
            ).status,
          ).toBe(204);
      }
      const a = await relayUntil(u.id);
      expect(a).toMatchObject({ status: 'active', rate: 20 });
      expect(a.code).toMatch(/^[A-Z]{1,6}OPC\d{2,3}$/);
      await t.app.get(OutboxRelayService).relayOnce();
      expect(await t.prisma.db.affiliate.count({ where: { userId: u.id } })).toBe(1);
    }
  });

  it('REQ-301 song song cùng sự kiện không trùng; rate ngoài 1–50 bị DB chặn', async () => {
    const u = await createUser(t, { fee: 'pending_payment' });
    const p = await confirmFee(t, u.id, new Date('2026-10-01T01:00:00Z'));
    const h = t.app.get(AffiliateLifecycleHandler);
    await Promise.all([h.onFeeConfirmed(p), h.onFeeConfirmed(p)]);
    expect(await t.prisma.db.affiliate.count({ where: { userId: u.id } })).toBe(1);
    await expect(
      t.prisma.db.affiliate.update({ where: { userId: u.id }, data: { rate: 51 } }),
    ).rejects.toThrow();
    await expect(
      t.prisma.db.affiliate.update({ where: { userId: u.id }, data: { rate: 0 } }),
    ).rejects.toThrow();
  });

  it('REQ-301 backfill idempotent: kỳ phí thật mới tạo; expired paused, pending và NĐT không tạo', async () => {
    const now = new Date('2026-10-01T01:00:00Z');
    const paid = await createUser(t, { fee: 'pending_payment' });
    await confirmFee(t, paid.id, now);
    await t.prisma.db.membershipFee.update({
      where: { userId: paid.id },
      data: { status: 'expired', validUntil: now },
    });
    const pending = await createUser(t, { fee: 'pending_payment' });
    const investor = await createUser(t, { accountType: 'investor', fee: 'active' });
    const service = t.app.get(AffiliateBackfillService);
    await service.ensureForPaidMembers(new Date(now.getTime() + 1));
    expect(
      (await t.prisma.db.affiliate.findUniqueOrThrow({ where: { userId: paid.id } })).status,
    ).toBe('paused');
    expect(
      await t.prisma.db.affiliate.count({ where: { userId: { in: [pending.id, investor.id] } } }),
    ).toBe(0);
    expect(await service.ensureForPaidMembers(new Date(now.getTime() + 1))).toBe(0);
  });
});
