import { accountLockedUntilMessage } from '@opchub/shared';
import { Prisma } from '@opchub/db';
import {
  chatMessagePageSchema,
  chatMessageSchema,
  moderationSettingsSchema,
  reportSchema,
} from '@opchub/shared/api-domains';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AccountLockService } from '@/modules/account';
import { ReportService } from '@/modules/moderation';
import { addMember, createGroup, removeTestGroups, tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState, type CreatedUser } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

/**
 * TIP-V4-612 (REQ-507, D-77, D-83, §26.6): báo cáo / từ khoá ẩn ngay + tính vi phạm; lần 1 cảnh báo,
 * từ lần 2 (90 ngày) khoá tự động N ngày + thu hồi phiên; Khôi phục tin bỏ tính + mở khoá tự động;
 * khoá thủ công không tự mở; hết hạn tự mở (job + đăng nhập); thời gian khoá do Admin chọn.
 */
describe('Kiểm duyệt §26.6 — vi phạm, khoá N ngày, khôi phục (TIP-V4-612)', () => {
  let t: TestApp;
  let admin: string;
  let settings: Awaited<ReturnType<TestApp['prisma']['db']['appSetting']['findUnique']>>;
  let isolated = false;
  beforeAll(async () => {
    t = await createTestApp();
    await flushAuthState(t);
    admin = await tokenOf(t, await createUser(t, { systemRole: 'admin' }));
    settings = await t.prisma.db.appSetting.findUnique({ where: { key: 'moderation' } });
    // This suite verifies absent-row defaults, independently of earlier AI settings fixtures.
    await t.prisma.db.appSetting.deleteMany({ where: { key: 'moderation' } });
    isolated = true;
  });
  beforeEach(() => flushAuthState(t));
  afterAll(async () => {
    if (!t) return;
    try {
      await removeTestGroups(t);
    } finally {
      try {
        if (isolated) {
          await t.prisma.db.$transaction(async (tx) => {
            await tx.appSetting.deleteMany({ where: { key: 'moderation' } });
            if (settings) {
              await tx.appSetting.create({
                data: { ...settings, value: settings.value ?? Prisma.JsonNull },
              });
            }
          });
          expect(await t.prisma.db.appSetting.findUnique({ where: { key: 'moderation' } })).toEqual(
            settings,
          );
        }
      } finally {
        await t.close();
      }
    }
  });

  async function setup() {
    const g = await createGroup(t);
    const room = `${g.id}-general`;
    const [sender, a] = await Promise.all([
      createUser(t, { fee: 'active', password: 'Matkhau@123' }),
      createUser(t, { fee: 'active' }),
    ]);
    for (const u of [sender, a]) await addMember(t, g.id, u.id);
    const senderTk = await tokenOf(t, sender);
    const send = async (body: string) =>
      chatMessageSchema.parse(
        await (
          await t.call(`/rooms/${room}/messages`, {
            method: 'POST',
            token: senderTk,
            json: { clientMsgId: randomUUID(), body },
          })
        ).json(),
      );
    return { room, sender, aTk: await tokenOf(t, a), send };
  }
  const report = async (token: string, id: string) =>
    reportSchema.parse(
      await (
        await t.call(`/messages/${id}/report`, { method: 'POST', token, json: { reason: 'spam' } })
      ).json(),
    );
  const act = (id: string, json: Record<string, unknown>, token = admin) =>
    t.call(`/admin/reports/${id}/action`, { method: 'POST', token, json });
  const userOf = (u: CreatedUser) =>
    t.prisma.db.user.findUniqueOrThrow({
      where: { id: u.id },
      select: { status: true, lockKind: true, lockedUntil: true },
    });
  const outbox = (type: string, userId: string) =>
    t.prisma.db.outboxEvent.count({
      where: { type, payload: { path: ['userId'], equals: userId } },
    });

  it('lần 1: ẩn ngay + cảnh báo; lần 2 (từ khoá): khoá tự động 7 ngày + thu hồi phiên', async () => {
    const { room, sender, aTk, send } = await setup();
    const m1 = await send('Bán đồ cũ giá rẻ');
    const r1 = await report(aTk, m1.id);
    expect(r1).toMatchObject({ violations: 1, senderLocked: false, canLock: true });
    const page = chatMessagePageSchema.parse(
      await (await t.call(`/rooms/${room}/messages`, { token: aTk })).json(),
    );
    expect(page.items.find((x) => x.id === m1.id)).toMatchObject({ body: '' });
    expect(await outbox('moderation.warned', sender.id)).toBe(1);
    expect((await userOf(sender)).status).toBe('active');

    const m2 = await send('Ai cần vay nóng liên hệ');
    await t.app.get(ReportService).keywordHit(m2.id, 'vay nóng');
    await t.app.get(ReportService).keywordHit(m2.id, 'vay nóng');
    const u = await userOf(sender);
    expect(u).toMatchObject({ status: 'locked', lockKind: 'auto' });
    const days = ((u.lockedUntil?.getTime() ?? 0) - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(6.9);
    expect(days).toBeLessThanOrEqual(7);
    expect(await outbox('user.session_revoked', sender.id)).toBe(1);
    expect(await t.prisma.db.moderationViolation.count({ where: { userId: sender.id } })).toBe(2);
    const login = await t.call('/auth/login', {
      method: 'POST',
      json: { identifier: sender.email, password: 'Matkhau@123' },
    });
    expect(login.status).toBe(403);
    expect(JSON.stringify(await login.json())).toContain(
      accountLockedUntilMessage(u.lockedUntil ?? new Date()),
    );
  });

  it('Khôi phục tin: hiện lại nguyên văn, không tính vi phạm, mở ngay khoá tự động; 409 lần 2', async () => {
    const { room, sender, aTk, send } = await setup();
    const m1 = await send('Tin một');
    const m2 = await send('Tin hai');
    const r1 = await report(aTk, m1.id);
    await report(aTk, m2.id);
    expect((await userOf(sender)).lockKind).toBe('auto');
    const res = await act(r1.id, { action: 'restore' });
    expect(res.status).toBe(200);
    expect(reportSchema.parse(await res.json())).toMatchObject({
      status: 'resolved',
      violations: 1,
      senderLocked: false,
    });
    expect(await userOf(sender)).toMatchObject({
      status: 'active',
      lockKind: null,
      lockedUntil: null,
    });
    const page = chatMessagePageSchema.parse(
      await (await t.call(`/rooms/${room}/messages`, { token: aTk })).json(),
    );
    const back = page.items.find((x) => x.id === m1.id);
    expect(back).toMatchObject({ body: 'Tin một' });
    expect(back?.hiddenAt ?? null).toBeNull();
    expect((await act(r1.id, { action: 'restore' })).status).toBe(409);
    expect(
      await t.prisma.db.auditLog.count({
        where: { action: 'moderation.restore', entityId: r1.id },
      }),
    ).toBe(1);
    // Job từ khoá chạy lại cho tin đã khôi phục: không ẩn lại, không tính lại
    await t.app.get(ReportService).keywordHit(m1.id, 'tin');
    expect(
      (await t.prisma.db.message.findUniqueOrThrow({ where: { id: m1.id } })).hiddenAt,
    ).toBeNull();
  });

  it('khoá thủ công 3 ngày không tự mở khi Khôi phục tin; thiếu groups.moderate → 403', async () => {
    const { sender, aTk, send } = await setup();
    const r1 = await report(aTk, (await send('Một')).id);
    const r2 = await report(aTk, (await send('Hai')).id);
    const viewer = await tokenOf(t, await createUser(t, { adminPermissions: ['groups.view'] }));
    expect((await act(r1.id, { action: 'lock', days: 3 }, viewer)).status).toBe(403);
    // r2 đã khoá tự động → khoá thủ công đè không được (đang khoá) — mở rồi khoá thủ công 3 ngày
    await t.prisma.db.user.update({
      where: { id: sender.id },
      data: { status: 'active', lockKind: null, lockedUntil: null },
    });
    expect((await act(r1.id, { action: 'lock', days: 3 })).status).toBe(200);
    const u = await userOf(sender);
    expect(u).toMatchObject({ status: 'locked', lockKind: 'manual' });
    expect(Math.round(((u.lockedUntil?.getTime() ?? 0) - Date.now()) / 86_400_000)).toBe(3);
    expect((await act(r2.id, { action: 'restore' })).status).toBe(200);
    expect((await userOf(sender)).status).toBe('locked');
  });

  it('vi phạm cũ hơn 90 ngày không tính; hết hạn khoá → job / đăng nhập tự mở', async () => {
    const { sender, aTk, send } = await setup();
    const old = await report(aTk, (await send('Cũ')).id);
    await t.prisma.db.moderationViolation.update({
      where: { reportId: old.id },
      data: { at: new Date(Date.now() - 91 * 86_400_000) },
    });
    const fresh = await report(aTk, (await send('Mới')).id);
    expect(fresh.violations).toBe(1);
    expect((await userOf(sender)).status).toBe('active');

    await report(aTk, (await send('Mới nữa')).id);
    expect((await userOf(sender)).status).toBe('locked');
    await t.prisma.db.user.update({
      where: { id: sender.id },
      data: { lockedUntil: new Date(Date.now() - 1000) },
    });
    const login = await t.call('/auth/login', {
      method: 'POST',
      json: { identifier: sender.email, password: 'Matkhau@123' },
    });
    expect(login.status).toBe(200);
    expect(await userOf(sender)).toMatchObject({ status: 'active', lockKind: null });
    expect(await outbox('user.unlocked', sender.id)).toBe(1);

    const other = await createUser(t, { fee: 'active' });
    await t.prisma.db.user.update({
      where: { id: other.id },
      data: { status: 'locked', lockKind: 'auto', lockedUntil: new Date(Date.now() - 1000) },
    });
    expect(await t.app.get(AccountLockService).sweepExpired()).toBeGreaterThanOrEqual(1);
    expect((await userOf(other)).status).toBe('active');
  });

  it('Thời gian khóa: mặc định 7 → Admin chọn 14 (audit) → khoá tự động kế tiếp 14 ngày', async () => {
    const get = async () =>
      moderationSettingsSchema.parse(
        await (await t.call('/admin/moderation/settings', { token: admin })).json(),
      );
    const since = new Date();
    expect(await get()).toEqual({ autoLockDays: 7 });
    const put = (json: unknown, token = admin) =>
      t.call('/admin/moderation/settings', { method: 'PUT', token, json });
    expect((await put({ autoLockDays: 5 })).status).toBe(400);
    const viewer = await tokenOf(t, await createUser(t, { adminPermissions: ['groups.view'] }));
    expect((await put({ autoLockDays: 14 }, viewer)).status).toBe(403);
    expect((await put({ autoLockDays: 14 })).status).toBe(200);
    expect(await get()).toEqual({ autoLockDays: 14 });
    expect(
      await t.prisma.db.auditLog.count({
        where: { action: 'moderation.settings.update', createdAt: { gte: since } },
      }),
    ).toBe(1);

    const { sender, aTk, send } = await setup();
    await report(aTk, (await send('A')).id);
    await report(aTk, (await send('B')).id);
    const u = await userOf(sender);
    expect(Math.round(((u.lockedUntil?.getTime() ?? 0) - Date.now()) / 86_400_000)).toBe(14);
    await t.prisma.db.appSetting.deleteMany({ where: { key: 'moderation' } });
  });
});
