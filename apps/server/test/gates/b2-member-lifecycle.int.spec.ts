import { loginResponseSchema, meSchema } from '@opchub/shared/api';
import { myMembershipSchema } from '@opchub/shared/api-domains';
import { parseOutboxPayload } from '@opchub/shared/outbox';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { FeeEventsHandler, ReconcileService } from '@/modules/membership-fee';
import { flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

/**
 * Cổng pha B2 (TIP-B15 checklist): vòng đời thành viên đầu-cuối qua API thật —
 * đăng ký → OTP → phiên (phí pending, bị paywall) → hộp CK → webhook ngân hàng giả →
 * đối soát → consumer outbox → paywall mở bằng token CŨ → Admin thấy trạng thái active.
 */
describe('Cổng B2: vòng đời thành viên đầu-cuối', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
    await flushAuthState(t);
  });
  afterAll(async () => {
    await t.close();
  });

  it('đăng ký → trả phí → kích hoạt', async () => {
    const email = `gate-${Date.now().toString(36)}@test.opchub.vn`;
    const reg = await t.call('/auth/register/personal', {
      method: 'POST',
      json: {
        fullName: 'Thành Viên Cổng',
        phone: { country: 'vn', number: '' },
        email,
        password: 'Opchub@2026',
        persona: 'freelancer',
        groupIds: ['c1'],
      },
    });
    expect(reg.status).toBe(202);
    const verify = await t.call('/auth/otp/verify', {
      method: 'POST',
      json: { email, code: '123456' },
    });
    const session = loginResponseSchema.parse(await verify.json());
    const token = session.accessToken;
    expect(session.me.membershipFee?.status).toBe('pending_payment');
    expect((await t.call('/members/suggest?q=ab', { token })).status).toBe(402);

    const box = myMembershipSchema.parse(await (await t.call('/me/membership', { token })).json());
    const confirm = await t.call('/me/membership/transfer-confirm', {
      method: 'POST',
      token,
      headers: { 'Idempotency-Key': 'gate-1' },
    });
    expect(confirm.status).toBe(202);

    // Ngân hàng gửi webhook (FakeBank, ký HMAC) với nội dung CK đúng như hộp CK
    const sim = await t.call('/dev/bank/simulate', {
      method: 'POST',
      json: { amount: box.amount, content: box.transferContent.toLowerCase() },
    });
    expect(sim.status).toBe(200);
    // Worker: job khớp + consumer outbox (chạy đồng bộ trong test)
    const tx = await t.prisma.db.paymentTransaction.findFirstOrThrow({
      where: { content: box.transferContent.toLowerCase() },
      select: { id: true },
    });
    expect((await t.app.get(ReconcileService).match(tx.id)).matched).toBe(true);
    const ev = await t.prisma.db.outboxEvent.findFirstOrThrow({
      where: {
        type: 'membership_fee.activated',
        payload: { path: ['userId'], equals: session.me.id },
      },
      select: { payload: true },
    });
    await t.app
      .get(FeeEventsHandler)
      .handle(parseOutboxPayload('membership_fee.activated', ev.payload));

    // Token cũ (claim pending) vẫn qua paywall nhờ Redis auth:fee (S-03)
    expect((await t.call('/members/suggest?q=ab', { token })).status).toBe(200);
    const me = meSchema.parse(await (await t.call('/me', { token })).json());
    expect(me.membershipFee?.status).toBe('active');
  });
});
