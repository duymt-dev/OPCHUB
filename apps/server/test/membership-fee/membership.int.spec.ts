import { loginResponseSchema } from '@opchub/shared/api';
import { myMembershipSchema } from '@opchub/shared/api-domains';
import { parseOutboxPayload } from '@opchub/shared/outbox';
import { randomInt } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { FeeEventsHandler, ReconcileService } from '@/modules/membership-fee';
import type { FakeBankProvider } from '@opchub/integrations';
import { AuthStateService } from '@/common/auth';
import { BANK } from '@/common/integrations';
import { assignMemberCode, createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

describe('/me/membership + paywall theo Redis (TIP-B14)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await t.close();
  });
  beforeEach(async () => {
    await flushAuthState(t);
  });

  const tokenOf = async (email: string, password: string) =>
    loginResponseSchema.parse(
      await (
        await t.call('/auth/login', { method: 'POST', json: { identifier: email, password } })
      ).json(),
    ).accessToken;

  it('REQ-202 REQ-219 GET /me/membership (nội dung CK ổn định giữa các lần mở): nội dung CK "OPCHUB TV… 09…", bank từ env, mở được khi chưa đóng phí', async () => {
    const local = `09${String(randomInt(1e8)).padStart(8, '0')}`;
    const u = await createUser(t, { fee: 'pending_payment', phone: `+84${local.slice(1)}` });
    const code = await assignMemberCode(t, u.id);
    const res = await t.call('/me/membership', { token: await tokenOf(u.email, u.password) });
    expect(res.status).toBe(200);
    const m = myMembershipSchema.parse(await res.json());
    expect(m.transferContent).toBe(`OPCHUB ${code} ${local}`);
    expect(m.bank.accountNo).toBe('1203132809');
    expect(m.amount).toBe(600_000);
    const again = myMembershipSchema.parse(
      await (await t.call('/me/membership', { token: await tokenOf(u.email, u.password) })).json(),
    );
    expect(again.transferContent).toBe(m.transferContent);
    expect(m.transferContent).toMatch(/^[A-Z0-9 ]+$/);
  });

  it('BUG-018 D-57 /me/membership trả expired tức thời; /dashboard/live → 402 (job chưa chạy)', async () => {
    const u = await createUser(t, { fee: 'active' });
    await assignMemberCode(t, u.id);
    const past = new Date(Date.now() - 60_000);
    await t.prisma.db.membershipFee.update({
      where: { userId: u.id },
      data: { validUntil: past },
    });
    const token = await tokenOf(u.email, u.password);
    await t.app
      .get(AuthStateService)
      .setFee(u.id, { status: 'active', validUntil: past.toISOString() });
    const m = myMembershipSchema.parse(await (await t.call('/me/membership', { token })).json());
    expect(m.status).toBe('expired');
    const live = await t.call('/dashboard/live', { token });
    expect(live.status).toBe(402);
    // Không ghi DB: trạng thái vẫn active tới khi job đổi (outbox)
    const fee = await t.prisma.db.membershipFee.findUniqueOrThrow({
      where: { userId: u.id },
      select: { status: true },
    });
    expect(fee.status).toBe('active');
  });

  it('REQ-202 REQ-382 transfer-confirm (ghi consent): thiếu Idempotency-Key → 400; cùng key 2 lần → cùng kết quả 202', async () => {
    const u = await createUser(t, { fee: 'pending_payment' });
    const token = await tokenOf(u.email, u.password);
    const path = '/me/membership/transfer-confirm';
    expect((await t.call(path, { method: 'POST', token })).status).toBe(400);
    const headers = { 'Idempotency-Key': 'k-1' };
    const r1 = await t.call(path, { method: 'POST', token, headers });
    const r2 = await t.call(path, { method: 'POST', token, headers });
    expect(r1.status).toBe(202);
    expect(r2.status).toBe(202);
    expect(await r1.json()).toEqual({ status: 'pending_payment', awaitingWebhook: true });
    expect(await r2.json()).toEqual({ status: 'pending_payment', awaitingWebhook: true });
    // REQ-382 NR-R02: "Tôi đã chuyển khoản" = đồng ý điều kiện thanh toán → 1 dòng fee_policy
    await t.call(path, { method: 'POST', token, headers: { 'Idempotency-Key': 'k-2' } });
    expect(await t.prisma.db.consent.count({ where: { userId: u.id, kind: 'fee_policy' } })).toBe(
      1,
    );
  });

  it('REQ-202 paywall: token cũ (claim pending) → 402; sau kích hoạt + handler outbox → 200, có publish realtime', async () => {
    const u = await createUser(t, { fee: 'pending_payment' });
    const code = await assignMemberCode(t, u.id);
    const token = await tokenOf(u.email, u.password);
    expect((await t.call('/members/suggest?q=ab', { token })).status).toBe(402);

    const sub = t.redis.duplicate();
    const got: string[] = [];
    await sub.subscribe('socket:user');
    sub.on('message', (_c, m) => got.push(m));

    const bank = t.app.get<FakeBankProvider>(BANK);
    bank.push({ amount: 600_000, content: `OPCHUB ${code}` });
    const reconcile = t.app.get(ReconcileService);
    await reconcile.poll();
    const tx = await t.prisma.db.paymentTransaction.findFirstOrThrow({
      where: { content: `OPCHUB ${code}` },
      select: { id: true },
    });
    const r = await reconcile.match(tx.id);
    expect(r.matched).toBe(true);
    // Mô phỏng relay worker: chạy consumer outbox
    const ev = await t.prisma.db.outboxEvent.findFirstOrThrow({
      where: { type: 'membership_fee.activated', payload: { path: ['userId'], equals: u.id } },
      select: { payload: true },
    });
    await t.app
      .get(FeeEventsHandler)
      .handle(parseOutboxPayload('membership_fee.activated', ev.payload));
    expect((await t.call('/members/suggest?q=ab', { token })).status).toBe(200);
    await new Promise((res) => setTimeout(res, 100));
    expect(got.some((m) => m.includes(u.id) && m.includes('membership.updated'))).toBe(true);
    await sub.quit();
  });
});
