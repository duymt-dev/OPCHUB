import { loginResponseSchema } from '@opchub/shared/api';
import { adminMemberPageSchema, adminMemberSchema } from '@opchub/shared/api-domains';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

describe('Admin Thành viên (TIP-B15)', () => {
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

  const tokenOf = async (u: { email: string; password: string }) => {
    const res = await t.call('/auth/login', {
      method: 'POST',
      json: { identifier: u.email, password: u.password },
    });
    return loginResponseSchema.parse(await res.json()).accessToken;
  };
  const auditCount = (action: string, entityId: string) =>
    t.prisma.db.auditLog.count({ where: { action, entityId } });

  it('danh sách khớp adminMemberPageSchema, lọc theo loại + tìm không dấu; không có super_admin/investor', async () => {
    const admin = await createUser(t, { systemRole: 'admin' });
    const tag = `Qx${Date.now().toString(36)}`;
    const biz = await createUser(t, { accountType: 'business' });
    await t.prisma.db.user.update({ where: { id: biz.id }, data: { fullName: `Trần Ánh ${tag}` } });
    await createUser(t, { accountType: 'investor' });

    const token = await tokenOf(admin);
    const res = await t.call(`/admin/users?type=business&q=${encodeURIComponent(`anh ${tag}`)}`, {
      token,
    });
    expect(res.status).toBe(200);
    const page = adminMemberPageSchema.parse(await res.json());
    expect(page.items.map((m) => m.id)).toEqual([biz.id]);
    expect(page.total).toBe(1);
    expect(page.counts.all).toBe(page.counts.business + page.counts.personal);
    expect(page.counts.all).toBeGreaterThan(1);

    const all = adminMemberPageSchema.parse(
      await (await t.call('/admin/users?page=1&size=100', { token })).json(),
    );
    expect(all.items.every((m) => m.accountType !== ('investor' as string))).toBe(true);
  });

  it('moderator (m.view) xem được, khoá → 403; member → 403', async () => {
    const mod = await createUser(t, { systemRole: 'moderator' });
    const target = await createUser(t);
    const token = await tokenOf(mod);
    expect((await t.call('/admin/users', { token })).status).toBe(200);
    const lock = await t.call(`/admin/users/${target.id}/status`, {
      method: 'PATCH',
      token,
      json: { status: 'locked' },
    });
    expect(lock.status).toBe(403);
    const member = await createUser(t, { fee: 'active' });
    expect((await t.call('/admin/users', { token: await tokenOf(member) })).status).toBe(403);
  });

  it('khoá → token cũ 403, đăng nhập 403, refresh bị thu hồi, audit user.lock; mở khoá lại đăng nhập được', async () => {
    const admin = await createUser(t, { systemRole: 'admin' });
    const target = await createUser(t, { fee: 'active' });
    const targetToken = await tokenOf(target);
    const token = await tokenOf(admin);

    const r = await t.call(`/admin/users/${target.id}/status`, {
      method: 'PATCH',
      token,
      json: { status: 'locked', reason: 'Spam' },
    });
    expect(r.status).toBe(200);
    // Guard B07 kiểm `auth:locked` trước version → 403 "đã bị khóa" (chính xác hơn AC 401 của TIP)
    expect((await t.call('/me', { token: targetToken })).status).toBe(403);
    const relogin = await t.call('/auth/login', {
      method: 'POST',
      json: { identifier: target.email, password: target.password },
    });
    expect(relogin.status).toBe(403);
    expect(await auditCount('user.lock', target.id)).toBe(1);
    expect(
      await t.prisma.db.outboxEvent.count({
        where: { type: 'user.locked', payload: { path: ['userId'], equals: target.id } },
      }),
    ).toBe(1);
    // Khoá lần 2 → 409 (đã ở trạng thái này)
    const again = await t.call(`/admin/users/${target.id}/status`, {
      method: 'PATCH',
      token,
      json: { status: 'locked' },
    });
    expect(again.status).toBe(409);

    const unlock = await t.call('/admin/users/status', {
      method: 'POST',
      token,
      json: { userIds: [target.id], status: 'active' },
    });
    expect(await unlock.json()).toEqual({ updated: 1 });
    await flushAuthState(t);
    expect((await tokenOf(target)).length).toBeGreaterThan(10);
  });

  it('khoá hàng loạt bỏ qua super_admin + TK đã khoá (idempotent)', async () => {
    const admin = await createUser(t, { systemRole: 'admin' });
    const sa = await createUser(t, { systemRole: 'super_admin' });
    const a = await createUser(t);
    const b = await createUser(t, { status: 'locked' });
    const r = await t.call('/admin/users/status', {
      method: 'POST',
      token: await tokenOf(admin),
      json: { userIds: [sa.id, a.id, b.id], status: 'locked' },
    });
    expect(await r.json()).toEqual({ updated: 1 });
  });

  it('đổi vai trò: admin (không có s.role) → 403; super_admin → 200 + audit permission', async () => {
    const admin = await createUser(t, { systemRole: 'admin' });
    const sa = await createUser(t, { systemRole: 'super_admin' });
    const target = await createUser(t, { systemRole: 'moderator' });
    const body = { role: 'admin' };
    expect(
      (
        await t.call(`/admin/users/${target.id}/role`, {
          method: 'PATCH',
          token: await tokenOf(admin),
          json: body,
        })
      ).status,
    ).toBe(403);
    const ok = await t.call(`/admin/users/${target.id}/role`, {
      method: 'PATCH',
      token: await tokenOf(sa),
      json: body,
    });
    expect(ok.status).toBe(200);
    expect(adminMemberSchema.parse(await ok.json()).systemRole).toBe('admin');
    const log = await t.prisma.db.auditLog.findFirstOrThrow({
      where: { action: 'user.role_change', entityId: target.id },
      select: { summary: true, tag: true },
    });
    expect(log).toEqual({
      summary: 'Đổi vai trò Điều phối viên → Quản trị viên',
      tag: 'permission',
    });
  });

  it('xác minh DN: pending → verified; lần 2 → 409', async () => {
    const admin = await createUser(t, { systemRole: 'admin' });
    const biz = await createUser(t, { accountType: 'business' });
    await t.prisma.db.businessProfile.create({
      data: {
        userId: biz.id,
        taxCode: '0109999000',
        companyName: 'PT Nusantara Teknologi',
        representative: 'Rina Sari',
        position: 'CEO',
        mainField: 'Phần mềm',
        subFields: [],
        verification: 'pending',
      },
    });
    const token = await tokenOf(admin);
    const path = `/admin/users/${biz.id}/verification`;
    const r = await t.call(path, { method: 'POST', token, json: { decision: 'approve' } });
    expect(r.status).toBe(200);
    expect(adminMemberSchema.parse(await r.json()).business?.verification).toBe('verified');
    expect(
      (await t.call(path, { method: 'POST', token, json: { decision: 'approve' } })).status,
    ).toBe(409);
  });

  it('gán nhóm: thành viên chính thức + member_count tăng; gán lại không tăng thêm', async () => {
    const admin = await createUser(t, { systemRole: 'admin' });
    const a = await createUser(t);
    const b = await createUser(t);
    const token = await tokenOf(admin);
    const before = await t.prisma.db.group.findUniqueOrThrow({
      where: { id: 'c5' },
      select: { memberCount: true },
    });
    const body = { userIds: [a.id, b.id, 'khong-ton-tai'], groupIds: ['c5'] };
    const r = await t.call('/admin/users/assign-groups', { method: 'POST', token, json: body });
    expect(await r.json()).toEqual({ updated: 2 });
    await t.call('/admin/users/assign-groups', { method: 'POST', token, json: body });
    const after = await t.prisma.db.group.findUniqueOrThrow({
      where: { id: 'c5' },
      select: { memberCount: true },
    });
    expect(after.memberCount - before.memberCount).toBe(2);
  });

  it('xuất danh sách → 202 job + audit export.users', async () => {
    const admin = await createUser(t, { systemRole: 'admin' });
    const r = await t.call('/admin/users/export', {
      method: 'POST',
      token: await tokenOf(admin),
      json: {},
    });
    expect(r.status).toBe(202);
    const { jobId } = (await r.json()) as { jobId: string };
    expect(await auditCount('export.users', jobId)).toBe(1);
  });
});
