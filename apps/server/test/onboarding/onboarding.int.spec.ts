import { adminMemberPageSchema, onboardingSchema } from '@opchub/shared/api-domains';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { OnboardingRemindService, OnboardingService } from '@/modules/onboarding';
import { createEvent, removeTestEvents } from '../factories/event.factory';
import { addMember, createGroup, removeTestGroups, tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

/**
 * TIP-V4-611 (REQ-505, D-85, D-88): 8 bước tính từ dữ liệu thật (DN / Cá nhân, khoá khi chưa phí),
 * cờ idempotent, tiến độ cho bộ lọc Admin, cột x/8 không N+1, Nhắc ≤ 1 lần / 24 giờ.
 */
describe('Onboarding 8 bước (TIP-V4-611)', () => {
  let t: TestApp;
  let admin: string;
  beforeAll(async () => {
    t = await createTestApp();
    await flushAuthState(t);
    admin = await tokenOf(t, await createUser(t, { systemRole: 'admin' }));
  });
  beforeEach(() => flushAuthState(t));
  afterAll(async () => {
    await removeTestEvents(t);
    await removeTestGroups(t);
    await t.close();
  });

  const mine = async (token: string) =>
    onboardingSchema.parse(await (await t.call('/me/onboarding', { token })).json());

  it('chưa đóng phí: bước 1 mở, 2–8 khoá; đã phí + dữ liệu thật → đếm đúng; NĐT 204', async () => {
    const unpaid = await createUser(t, { accountType: 'business', fee: 'pending_payment' });
    const o = await mine(await tokenOf(t, unpaid));
    expect(o).toMatchObject({ accountType: 'business', paid: false, done: 0 });
    expect(o.steps.map((s) => s.key)).toEqual([
      'pay',
      'prof',
      'grp',
      'chat',
      'st',
      'nd',
      'aff',
      'ev',
    ]);
    expect(o.steps.filter((s) => s.locked)).toHaveLength(7);

    const per = await createUser(t, { accountType: 'personal', fee: 'active' });
    const token = await tokenOf(t, per);
    const g = await createGroup(t);
    await addMember(t, g.id, per.id);
    const ev = await createEvent(t);
    expect((await t.call(`/events/${ev.id}/registration`, { method: 'POST', token })).status).toBe(
      201,
    );
    const p = await mine(token);
    expect(p.steps.map((s) => s.key)).toEqual([
      'pay',
      'prof',
      'grp',
      'chat',
      'pj',
      'ex',
      'aff',
      'ev',
    ]);
    expect(p.steps.filter((s) => s.done).map((s) => s.key)).toEqual(['pay', 'grp', 'ev']);
    expect(p.fundraising).toBeNull();

    const inv = await createUser(t, { accountType: 'investor' });
    expect((await t.call('/me/onboarding', { token: await tokenOf(t, inv) })).status).toBe(204);
  });

  it('cờ khám phá / chia sẻ link: idempotent, key lạ 404; tiến độ ghi khi refresh', async () => {
    const per = await createUser(t, { accountType: 'personal', fee: 'active' });
    const token = await tokenOf(t, per);
    const flag = (k: string) => t.call(`/me/onboarding/flags/${k}`, { method: 'POST', token });
    expect((await flag('explore')).status).toBe(204);
    expect((await flag('explore')).status).toBe(204);
    expect((await flag('affiliate_share')).status).toBe(204);
    expect((await flag('chat')).status).toBe(404);
    expect(await t.prisma.db.onboardingFlag.count({ where: { userId: per.id } })).toBe(2);
    expect(
      await t.prisma.db.outboxEvent.count({
        where: { type: 'onboarding.touched', payload: { path: ['userId'], equals: per.id } },
      }),
    ).toBe(2);
    expect((await mine(token)).done).toBe(3);

    await t.app.get(OnboardingService).refresh([per.id]);
    const row = await t.prisma.db.onboardingProgress.findUnique({ where: { userId: per.id } });
    expect(row?.done).toBe(3);
  });

  it('Admin: cột x/8 + lọc Đã / Chưa hoàn tất qua bảng tiến độ; query không tăng theo dòng', async () => {
    const a = await createUser(t, { accountType: 'business', fee: 'active' });
    await t.app.get(OnboardingService).refresh([a.id]);
    const list = async (qs: string) =>
      adminMemberPageSchema.parse(
        await (await t.call(`/admin/users?${qs}`, { token: admin })).json(),
      );
    const todo = await list('onboarding=todo&size=50');
    const row = todo.items.find((x) => x.id === a.id);
    expect(row?.onboarding).toMatchObject({ done: 1, reminded: false });
    expect(row?.onboarding.missing).toEqual(['prof', 'grp', 'chat', 'st', 'nd', 'aff', 'ev']);

    await t.prisma.db.onboardingProgress.update({ where: { userId: a.id }, data: { done: 8 } });
    expect((await list('onboarding=done&size=50')).items.map((x) => x.id)).toContain(a.id);
    expect((await list('onboarding=todo&size=50')).items.map((x) => x.id)).not.toContain(a.id);
  });

  it('D-88 Nhắc: thông báo + email một lần, audit; lần 2 trong 24 giờ 429; thiếu quyền 403', async () => {
    const m = await createUser(t, { accountType: 'personal', fee: 'active' });
    const remind = (token: string) =>
      t.call(`/admin/users/${m.id}/onboarding-remind`, { method: 'POST', token });
    const viewer = await tokenOf(t, await createUser(t, { adminPermissions: ['members.view'] }));
    expect((await remind(viewer)).status).toBe(403);
    expect((await remind(admin)).status).toBe(204);
    const again = await remind(admin);
    expect(again.status).toBe(429);
    expect(JSON.stringify(await again.json())).toContain('Đã nhắc thành viên này trong 24 giờ qua');
    expect(
      await t.prisma.db.auditLog.count({
        where: { action: 'member.onboarding_remind', entityId: m.id },
      }),
    ).toBe(1);

    const ev = await t.prisma.db.outboxEvent.findFirstOrThrow({
      where: { type: 'onboarding.reminded', payload: { path: ['userId'], equals: m.id } },
      select: { payload: true },
    });
    const p = ev.payload as { userId: string; reminderId: string; missing: string[] };
    const svc = t.app.get(OnboardingRemindService);
    await svc.deliver(p);
    await svc.deliver(p);
    const notes = await t.prisma.db.notification.findMany({
      where: { userId: m.id, type: 'system' },
      select: { title: true, body: true, link: true },
    });
    expect(notes).toEqual([
      expect.objectContaining({
        title: 'Admin nhắc: hoàn tất hướng dẫn bắt đầu',
        link: '/dashboard',
      }),
    ]);
    expect(notes[0]?.body).toContain('Còn thiếu: Hồ sơ');
    expect(await t.prisma.db.mailLog.count({ where: { kind: 'onboarding', to: m.email } })).toBe(1);

    const page = adminMemberPageSchema.parse(
      await (await t.call('/admin/users?size=50', { token: admin })).json(),
    );
    expect(page.items.find((x) => x.id === m.id)?.onboarding.reminded).toBe(true);
  });

  it('mẫu email nhắc: mặc định → Admin sửa (audit) → đọc lại; thiếu settings.mail 403', async () => {
    const get = async () => (await t.call('/admin/mail/onboarding', { token: admin })).json();
    expect(await get()).toMatchObject({ subject: 'Hoàn tất hướng dẫn bắt đầu trên OPC Hub' });
    const tpl = { subject: 'Nhắc thử', body: 'Chào {{ten}}, còn {{con_thieu}}: {{link}}' };
    const put = await t.call('/admin/mail/onboarding', { method: 'PUT', token: admin, json: tpl });
    expect(put.status).toBe(200);
    expect(await get()).toEqual(tpl);
    const viewer = await tokenOf(t, await createUser(t, { adminPermissions: ['members.view'] }));
    expect((await t.call('/admin/mail/onboarding', { token: viewer })).status).toBe(403);
    await t.prisma.db.appSetting.delete({ where: { key: 'onboarding_mail' } });
  });
});
