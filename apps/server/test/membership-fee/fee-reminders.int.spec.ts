import { parseOutboxPayload } from '@opchub/shared/outbox';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { FeeSchedulerService } from '@/modules/membership-fee';
import { NotificationEventsHandler } from '@/modules/notification';
import { createUser, flushAuthState, loginOf, tokenBodySchema } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

const DAY = 86_400_000;

describe('nhắc phí T-30 / T-7 / T-0 / T+3 lúc 08:00 (TIP-V2-301, NA-04, D-57)', () => {
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

  /** TV active có hạn cách `now` d ngày (cùng giờ trong ngày) */
  async function member(d: number, now: Date) {
    const u = await createUser(t, { fee: 'active' });
    await t.prisma.db.membershipFee.update({
      where: { userId: u.id },
      data: { validUntil: new Date(now.getTime() + d * DAY) },
    });
    return u;
  }
  const statusOf = async (userId: string) =>
    (await t.prisma.db.membershipFee.findUniqueOrThrow({ where: { userId } })).status;
  const mails = (to: string) =>
    t.prisma.db.mailLog.findMany({
      where: { to, kind: 'fee_reminder' },
      select: { bodyHtml: true },
      orderBy: { createdAt: 'asc' },
    });
  const sentMilestones = async (userId: string) =>
    (await t.prisma.db.feeReminder.findMany({ where: { userId }, select: { milestone: true } }))
      .map((r) => r.milestone)
      .sort();
  /** Chạy consumer thông báo cho sự kiện nhắc phí của user (worker không chạy trong test) */
  async function deliver(userId: string) {
    const events = await t.prisma.db.outboxEvent.findMany({
      where: { type: 'membership_fee.reminded' },
      select: { payload: true },
    });
    const handler = t.app.get(NotificationEventsHandler);
    for (const e of events) {
      const mine = parseOutboxPayload('membership_fee.reminded', e.payload).items.filter(
        (i) => i.userId === userId,
      );
      if (mine.length) await handler.feeReminded({ items: mine });
    }
    return t.prisma.db.notification.findMany({
      where: { userId, type: 'membership' },
      select: { body: true, link: true },
    });
  }

  it('REQ-204 T-30 gửi 1 lần + thông báo; chạy lại cùng ngày không thêm', async () => {
    const now = new Date();
    const u = await member(30, now);
    await sched.run(now);
    expect(await statusOf(u.id)).toBe('expiring');
    const m = await mails(u.email);
    expect(m).toHaveLength(1);
    expect(m[0]!.bodyHtml).toContain('sẽ hết hạn ngày');
    expect(m[0]!.bodyHtml).toContain('không hoàn lại');
    await sched.run(now);
    expect(await mails(u.email)).toHaveLength(1);
    const n = await deliver(u.id);
    expect(n).toHaveLength(1);
    expect(n[0]!.link).toBe('/membership/pay');
  });

  it('REQ-204 bù mốc khi lỡ job: d 8 → 6 vẫn nhận T-7 đúng 1 lần', async () => {
    const now = new Date();
    const u = await member(8, now);
    await sched.remind(new Date(now.getTime() - 22 * DAY));
    expect(await sentMilestones(u.id)).toEqual(['T-30']);
    await sched.remind(now);
    expect(await sentMilestones(u.id)).toEqual(['T-30']);
    await sched.remind(new Date(now.getTime() + 2 * DAY));
    await sched.remind(new Date(now.getTime() + 3 * DAY));
    expect(await sentMilestones(u.id)).toEqual(['T-30', 'T-7']);
    expect(await mails(u.email)).toHaveLength(2);
  });

  it('REQ-204 T-0 và T+3 kèm expired; quá hạn 11 ngày không mail', async () => {
    const now = new Date();
    const a = await member(0, now);
    await t.prisma.db.membershipFee.update({
      where: { userId: a.id },
      data: { validUntil: new Date(now.getTime() + 60_000) },
    });
    const b = await member(-3, now);
    const c = await member(-11, now);
    await sched.run(now);
    expect(await sentMilestones(a.id)).toEqual(['T-0']);
    expect((await mails(a.email))[0]!.bodyHtml).toContain('hết hạn hôm nay');
    expect(await sentMilestones(b.id)).toEqual(['T+3']);
    expect((await mails(b.email))[0]!.bodyHtml).toContain('đã hết hạn');
    expect(await statusOf(b.id)).toBe('expired');
    expect(await mails(c.email)).toHaveLength(0);
  });

  it('REQ-204 NR-R03 gia hạn reset mốc: kỳ mới nhận lại T-30', async () => {
    const now = new Date();
    const u = await member(30, now);
    await sched.remind(now);
    await t.prisma.db.membershipFee.update({
      where: { userId: u.id },
      data: { status: 'active', validUntil: new Date(now.getTime() + 395 * DAY) },
    });
    await sched.remind(new Date(now.getTime() + 365 * DAY));
    expect(await sentMilestones(u.id)).toEqual(['T-30', 'T-30']);
    expect(await mails(u.email)).toHaveLength(2);
  });

  it('REQ-204 hai lượt song song không gửi trùng', async () => {
    const now = new Date();
    const u = await member(7, now);
    await Promise.all([sched.remind(now), sched.remind(now)]);
    expect(await mails(u.email)).toHaveLength(1);
    expect(await sentMilestones(u.id)).toEqual(['T-7']);
  });

  it('REQ-204 pending_payment không nhắc tự động; Admin nhắc tay 2 lần → 2 mail + 2 thông báo', async () => {
    const now = new Date();
    const u = await createUser(t, { fee: 'pending_payment' });
    await sched.run(now);
    expect(await mails(u.email)).toHaveLength(0);
    const admin = await createUser(t, { systemRole: 'admin' });
    const token = tokenBodySchema.parse(await (await loginOf(t, admin)).json()).accessToken;
    for (let i = 0; i < 2; i++) {
      const res = await t.call('/admin/fees/remind', {
        method: 'POST',
        token,
        json: { userIds: [u.id] },
      });
      expect(res.status).toBe(202);
    }
    const m = await mails(u.email);
    expect(m).toHaveLength(2);
    expect(m[0]!.bodyHtml).toContain('chưa được thanh toán');
    const n = await deliver(u.id);
    expect(n).toHaveLength(2);
    expect(n[0]!.body).toContain('chưa được thanh toán');
    expect(await sentMilestones(u.id)).toEqual([]);
    expect(
      await t.prisma.db.auditLog.count({
        where: { action: 'fee.remind', entityId: { contains: u.id } },
      }),
    ).toBe(2);
  });
});
