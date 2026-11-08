import { FUNDRAISING_PLAN } from '../factories/prices';
import { parseOutboxPayload } from '@opchub/shared/outbox';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { FundraisingSchedulerService } from '@/modules/project';
import { tokenOf } from '../factories/group.factory';
import { createProject, removeTestProjects } from '../factories/project.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

const DAY = 86_400_000;
const NOW = new Date('2026-10-24T01:10:00Z');

/** TIP-V4-610 (D-82): job hằng ngày — hết hạn → expired + báo; còn ≤ 14 ngày → nhắc một lần */
describe('Gói Gọi vốn · job hết hạn + nhắc (TIP-V4-610)', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
    await flushAuthState(t);
  });
  afterAll(async () => {
    await removeTestProjects(t);
    await t.close();
  });

  async function activeFor(endsInDays: number) {
    const u = await createUser(t, { fee: 'active' });
    const p = await createProject(t, await tokenOf(t, u), {
      funding: { amount: 1_000_000_000, currency: 'VND', equityPercent: 5 },
    });
    const f = await t.prisma.db.projectFundraising.create({
      data: {
        projectId: p.id,
        ownerId: u.id,
        code: `GV9${String(Math.floor(Math.random() * 1e5)).padStart(5, '0')}`,
        amount: FUNDRAISING_PLAN.amount,
        status: 'active',
        startsAt: new Date(NOW.getTime() - 170 * DAY),
        endsAt: new Date(NOW.getTime() + endsInDays * DAY),
      },
    });
    return { u, p, f };
  }

  it('quá hạn → expired, thông báo + email; còn 10 ngày → nhắc một lần; còn 40 ngày → không', async () => {
    const old = await activeFor(-1);
    const soon = await activeFor(10);
    const far = await activeFor(40);
    const job = t.app.get(FundraisingSchedulerService);
    const r = await job.run(NOW);
    expect(r.expired).toBeGreaterThanOrEqual(1);
    expect(r.reminded).toBeGreaterThanOrEqual(1);
    const st = async (id: string) =>
      (await t.prisma.db.projectFundraising.findUniqueOrThrow({ where: { id } })).status;
    expect(await st(old.f.id)).toBe('expired');
    expect(await st(soon.f.id)).toBe('active');
    const soonRow = await t.prisma.db.projectFundraising.findUniqueOrThrow({
      where: { id: soon.f.id },
    });
    expect(soonRow.remindedAt).not.toBeNull();
    expect(
      (await t.prisma.db.projectFundraising.findUniqueOrThrow({ where: { id: far.f.id } }))
        .remindedAt,
    ).toBeNull();
    const mails = await t.prisma.db.mailLog.findMany({
      where: {
        kind: { in: ['fundraising', 'fundraising_expired'] },
        to: { in: [old.u.email, soon.u.email, far.u.email] },
      },
      select: { to: true, subject: true, kind: true },
    });
    expect(mails.map((m) => m.to).sort()).toEqual([old.u.email, soon.u.email].sort());
    expect(mails.find((m) => m.to === old.u.email)?.kind).toBe('fundraising_expired');
    expect(mails.find((m) => m.to === soon.u.email)?.kind).toBe('fundraising');
    const ev = await t.prisma.db.outboxEvent.count({
      where: { type: 'fundraising.reminded', createdAt: { gte: new Date(Date.now() - 60_000) } },
    });
    expect(ev).toBeGreaterThanOrEqual(1);
    // Chạy lại: không gửi lần hai
    await job.run(NOW);
    const again = await t.prisma.db.mailLog.count({
      where: {
        kind: { in: ['fundraising', 'fundraising_expired'] },
        to: { in: [old.u.email, soon.u.email] },
      },
    });
    expect(again).toBe(2);
    // Thông báo chuông đi qua outbox (consumer notification) — payload đủ chủ dự án + loại nhắc
    const items = (
      await t.prisma.db.outboxEvent.findMany({
        where: { type: 'fundraising.reminded' },
        select: { payload: true },
      })
    ).flatMap((e) => parseOutboxPayload('fundraising.reminded', e.payload).items);
    expect(items.filter((i) => i.fundraisingId === old.f.id).map((i) => i.kind)).toEqual([
      'expired',
    ]);
    expect(items.filter((i) => i.fundraisingId === soon.f.id).map((i) => i.kind)).toEqual([
      'renew',
    ]);
  });
});
