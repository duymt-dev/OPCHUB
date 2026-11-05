import { planAmount } from '../factories/prices';
import { loginResponseSchema } from '@opchub/shared/api';
import { myMembershipSchema } from '@opchub/shared/api-domains';
import { parseOutboxPayload } from '@opchub/shared/outbox';
import type { FakeBankProvider } from '@opchub/integrations';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AuthStateService } from '@/common/auth';
import { BANK } from '@/common/integrations';
import { FeeSchedulerService, ReconcileService } from '@/modules/membership-fee';
import { NotificationEventsHandler } from '@/modules/notification';
import { assignMemberCode, createUser, flushAuthState } from '../factories/user.factory';
import { connected, createSocketApp } from '../setup/socket-app';
import { createTestApp, type TestApp } from '../setup/test-app';

const DAY = 86_400_000;
const OTP = '123456';
let n = 0;
const uniqueEmail = () => `trial-${Date.now().toString(36)}-${(n += 1)}@test.opchub.vn`;

/** TIP-V42-702 (D-94 1A, D-113, BR-TRIAL-01 → 05): miễn phí 3 tháng + một cổng `isFeeUsable` */
describe('Miễn phí 3 tháng (TIP-V42-702)', () => {
  let t: TestApp;
  let sched: FeeSchedulerService;

  beforeAll(async () => {
    t = await createTestApp();
    sched = t.app.get(FeeSchedulerService);
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
  const feeOf = (userId: string) =>
    t.prisma.db.membershipFee.findUniqueOrThrow({
      where: { userId },
      select: { status: true, validUntil: true, paidAt: true, amount: true },
    });
  /** TV trial còn `d` ngày */
  async function trialMember(d: number, now = new Date()) {
    const u = await createUser(t, { fee: 'trial' });
    await t.prisma.db.membershipFee.update({
      where: { userId: u.id },
      data: { validUntil: new Date(now.getTime() + d * DAY) },
    });
    return u;
  }

  it('BR-TRIAL-01 đăng ký mới → trial ≈ 90 ngày, gọi được route cần phí, socket không limited', async () => {
    const email = uniqueEmail();
    const reg = await t.call('/auth/register/personal', {
      method: 'POST',
      json: {
        fullName: 'Người Dùng Thử',
        phone: { country: 'vn', number: '' },
        email,
        password: 'Opchub@2026',
        agreeTerms: true,
      },
    });
    expect(reg.status).toBe(202);
    const ok = await t.call('/auth/otp/verify', { method: 'POST', json: { email, code: OTP } });
    expect(ok.status).toBe(200);
    const { accessToken } = loginResponseSchema.parse(await ok.json());
    const u = await t.prisma.db.user.findUniqueOrThrow({ where: { email }, select: { id: true } });
    const fee = await feeOf(u.id);
    expect(fee.status).toBe('trial');
    expect(fee.paidAt).toBeNull();
    expect(fee.amount).toBe(planAmount('personal'));
    expect(Math.abs(fee.validUntil!.getTime() - (Date.now() + 90 * DAY))).toBeLessThan(5 * 60_000);
    expect((await t.call('/members/suggest?q=ab', { token: accessToken })).status).toBe(200);
    // Kết nối không cần scope membership (chỉ TK dùng được phí mới qua)
    const sock = await createSocketApp();
    try {
      expect(await connected(sock.connect(accessToken))).toEqual({ ok: true });
    } finally {
      await sock.close();
    }
    const m = myMembershipSchema.parse(
      await (await t.call('/me/membership', { token: accessToken })).json(),
    );
    expect(m).toMatchObject({ status: 'trial', neverPaid: true });
  });

  it('BR-TRIAL-02 trial quá hạn → 402 ngay; job → expired + outbox, chạy lại không đổi', async () => {
    const u = await createUser(t, { fee: 'trial' });
    const token = await tokenOf(u.email, u.password);
    const past = new Date(Date.now() - 60_000);
    await t.prisma.db.membershipFee.update({
      where: { userId: u.id },
      data: { validUntil: past },
    });
    await t.app
      .get(AuthStateService)
      .setFee(u.id, { status: 'trial', validUntil: past.toISOString() });
    expect((await t.call('/members/suggest?q=ab', { token })).status).toBe(402);
    const m = myMembershipSchema.parse(await (await t.call('/me/membership', { token })).json());
    expect(m).toMatchObject({ status: 'expired', neverPaid: true });

    await sched.sweep(new Date());
    expect((await feeOf(u.id)).status).toBe('expired');
    const changed = () =>
      t.prisma.db.outboxEvent.findMany({
        where: { type: 'membership_fee.changed', payload: { path: ['userId'], equals: u.id } },
        select: { payload: true },
      });
    const first = await changed();
    expect(first.map((e) => parseOutboxPayload('membership_fee.changed', e.payload))).toEqual([
      expect.objectContaining({ userId: u.id, status: 'expired' }),
    ]);
    await sched.sweep(new Date());
    expect(await changed()).toHaveLength(1);
  });

  it('BR-TRIAL-04 trial + CK đúng → active, kỳ 12 tháng tính từ hôm nay', async () => {
    const u = await trialMember(40);
    const code = await assignMemberCode(t, u.id);
    const bank = t.app.get<FakeBankProvider>(BANK);
    bank.push({ amount: planAmount('personal'), content: `OPCHUB ${code}` });
    const reconcile = t.app.get(ReconcileService);
    await reconcile.poll();
    const tx = await t.prisma.db.paymentTransaction.findFirstOrThrow({
      where: { content: `OPCHUB ${code}` },
      select: { id: true },
    });
    expect((await reconcile.match(tx.id)).matched).toBe(true);
    const fee = await feeOf(u.id);
    expect(fee.status).toBe('active');
    expect(fee.paidAt).not.toBeNull();
    const expected = new Date();
    expected.setUTCFullYear(expected.getUTCFullYear() + 1);
    // Không nối 40 ngày trial còn lại
    expect(Math.abs(fee.validUntil!.getTime() - expected.getTime())).toBeLessThan(2 * DAY);
  });

  it('REQ-620 BR-474 trial còn 7 / 1 ngày → mail trial + thông báo gia hạn; không gửi lại', async () => {
    const now = new Date();
    const a = await trialMember(7, now);
    const b = await trialMember(1, now);
    await sched.remind(now);
    await sched.remind(now);
    const cases = [
      { u: a, m: 'D7' },
      { u: b, m: 'D1' },
    ];
    for (const { u, m } of cases) {
      const mails = await t.prisma.db.mailLog.findMany({
        where: { to: u.email, kind: 'fee_reminder' },
        select: { bodyHtml: true, subject: true },
      });
      expect(mails).toHaveLength(1);
      expect(mails[0]!.subject).toBe('Sắp hết 3 tháng miễn phí OPC Hub');
      expect(mails[0]!.bodyHtml).toContain('miễn phí');
      const ms = await t.prisma.db.feeReminder.findMany({
        where: { userId: u.id },
        select: { milestone: true },
      });
      expect(ms.map((r) => r.milestone)).toEqual([m]);
    }
    const events = await t.prisma.db.outboxEvent.findMany({
      where: { type: 'membership_fee.reminded' },
      select: { payload: true },
    });
    const handler = t.app.get(NotificationEventsHandler);
    for (const e of events) {
      const items = parseOutboxPayload('membership_fee.reminded', e.payload).items.filter(
        (i) => i.userId === a.id,
      );
      if (items.length) await handler.feeReminded({ items });
    }
    const notes = await t.prisma.db.notification.findMany({
      where: { userId: a.id, type: 'membership' },
      select: { body: true },
    });
    expect(notes).toHaveLength(1);
    expect(notes[0]!.body).toContain('Gói Cá nhân hết hạn ngày');
  });

  it('REQ-620 BR-474 trial D30 enabled; expired excluded', async () => {
    const now = new Date();
    const a = await trialMember(30, now);
    const b = await trialMember(-3, now);
    await t.prisma.db.membershipFee.update({
      where: { userId: b.id },
      data: { status: 'expired' },
    });
    await sched.remind(now);
    const sent = await t.prisma.db.feeReminder.findMany({
      where: { userId: { in: [a.id, b.id] } },
      select: { userId: true, milestone: true },
    });
    expect(sent).toEqual([{ userId: a.id, milestone: 'D30' }]);
  });
});
