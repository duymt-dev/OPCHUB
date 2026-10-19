import { apiErrorSchema } from '@opchub/shared/api';
import { adminAccountListSchema, adminAccountRowSchema } from '@opchub/shared/api-domains';
import { argon2id, hash } from 'argon2';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';
import { cleanupAdminAccounts, roleIds, uniqueAdminEmail } from './helpers';

const TEMP_PWD = 'TamThoi@2026';

describe('Tài khoản quản trị — tạo + liệt kê (TIP-V2-201, RB-R02)', () => {
  let t: TestApp;
  let owner: string;
  let roles: Record<string, string>;
  const create = (json: unknown, token = owner) =>
    t.call('/admin/admin-accounts', { method: 'POST', token, json });
  const body = (email: string, extra: Record<string, unknown> = {}) => ({
    name: 'Nhân Sự Mới',
    phone: '+84901234567',
    email,
    roleId: roles.lecturer,
    password: TEMP_PWD,
    ...extra,
  });
  const errorOf = async (r: Response) => apiErrorSchema.parse(await r.json()).error;

  beforeAll(async () => {
    t = await createTestApp();
    roles = await roleIds(t);
    await cleanupAdminAccounts(t);
  });
  beforeEach(async () => {
    await flushAuthState(t);
    owner = await tokenOf(t, await createUser(t, { systemRole: 'super_admin' }));
  });
  afterAll(async () => {
    await cleanupAdminAccounts(t);
    await t.close();
  });

  it('AT-RB01 email thành viên bị từ chối', async () => {
    const member = await createUser(t);
    const r = await create(body(member.email.toUpperCase()));
    expect(r.status).toBe(409);
    expect((await errorOf(r)).fields).toEqual([
      {
        path: 'email',
        message: 'Email đã là tài khoản thành viên, vui lòng dùng email nội bộ riêng',
      },
    ]);
    expect(await t.prisma.db.adminUser.count({ where: { email: member.email } })).toBe(0);
  });

  it('REQ-322 email trùng TK quản trị 409', async () => {
    const email = uniqueAdminEmail();
    expect((await create(body(email))).status).toBe(201);
    const r = await create(body(email.toUpperCase(), { roleId: roles.editor }));
    expect(r.status).toBe(409);
    expect((await errorOf(r)).fields).toEqual([
      { path: 'email', message: 'Email đã thuộc tài khoản quản trị khác' },
    ]);
  });

  it('REQ-322 MK tạm < 8 ký tự 400', async () => {
    const email = uniqueAdminEmail();
    const r = await create(body(email, { password: 'Ab@1234' }));
    expect(r.status).toBe(400);
    expect((await errorOf(r)).fields).toEqual([
      { path: 'password', message: 'Mật khẩu tạm tối thiểu 8 ký tự' },
    ]);
    expect(await t.prisma.db.adminUser.count({ where: { email } })).toBe(0);
  });

  it('REQ-322 tạo TK gửi mail + audit cùng transaction', async () => {
    const email = uniqueAdminEmail();
    const r = await create(body(email));
    expect(r.status).toBe(201);
    const row = adminAccountRowSchema.parse(await r.json());
    expect(row).toMatchObject({
      email,
      phone: '+84901234567',
      roleId: roles.lecturer,
      roleName: 'Giảng viên',
      isSuperAdmin: false,
      twoFactor: false,
      status: 'active',
      online: false,
      lastLoginAt: null,
    });
    const db = await t.prisma.db.adminUser.findUniqueOrThrow({
      where: { email },
      select: { mustChangePwd: true, status: true, createdBy: true, passwordHash: true },
    });
    expect(db.mustChangePwd).toBe(true);
    expect(db.status).toBe('active');
    expect(db.passwordHash).not.toContain(TEMP_PWD);
    const mails = await t.prisma.db.mailLog.findMany({
      where: { to: email },
      select: { id: true, kind: true, subject: true, bodyHtml: true },
    });
    expect(mails).toHaveLength(1);
    expect(mails[0]?.kind).toBe('password_reset');
    expect(mails[0]?.subject).toBe('Tài khoản quản trị OPC Hub của bạn');
    expect(mails[0]?.bodyHtml).toContain('http://localhost:3001/login');
    expect(mails[0]?.bodyHtml).toContain(TEMP_PWD);
    expect(mails[0]?.bodyHtml).toContain('Vui lòng đổi mật khẩu ngay sau lần đăng nhập đầu tiên');
    const outbox = await t.prisma.db.outboxEvent.count({
      where: {
        type: 'mail.requested',
        payload: { path: ['mailLogId'], equals: mails[0]?.id ?? '' },
      },
    });
    expect(outbox).toBe(1);
    const audit = await t.prisma.db.auditLog.findMany({
      where: { action: 'admin_account.create', entityId: row.id },
      select: { tag: true, summary: true, actorId: true },
    });
    expect(audit).toEqual([
      {
        tag: 'permission',
        summary: 'tạo tài khoản quản trị Nhân Sự Mới (Giảng viên)',
        actorId: db.createdBy,
      },
    ]);
    const list = adminAccountListSchema.parse(
      await (await t.call('/admin/admin-accounts', { token: owner })).json(),
    );
    expect(list.items.find((i) => i.id === row.id)?.roleName).toBe('Giảng viên');
  });

  it('REQ-322 không cho chọn vai trò Super Admin', async () => {
    const email = uniqueAdminEmail();
    const r = await create(body(email, { roleId: roles.super_admin }));
    expect(r.status).toBe(400);
    expect((await errorOf(r)).fields).toEqual([
      { path: 'roleId', message: 'Không thể gán vai trò Super Admin' },
    ]);
    expect(await t.prisma.db.adminUser.count({ where: { email } })).toBe(0);
  });

  it('REQ-322 thiếu s.role → 403', async () => {
    const adm = await tokenOf(t, await createUser(t, { systemRole: 'admin' }));
    expect((await t.call('/admin/admin-accounts', { token: adm })).status).toBe(403);
    expect((await create(body(uniqueAdminEmail()), adm)).status).toBe(403);
  });

  it('RB-R03 đăng ký thành viên bằng email quản trị 409', async () => {
    const email = uniqueAdminEmail();
    await t.prisma.db.adminUser.create({
      data: {
        name: 'Quản trị có sẵn',
        email,
        roleId: roles.editor ?? '',
        passwordHash: await hash(TEMP_PWD, { type: argon2id }),
      },
    });
    const r = await t.call('/auth/register/personal', {
      method: 'POST',
      json: {
        fullName: 'Người Đăng Ký',
        phone: { country: 'vn', number: '' },
        email: email.toUpperCase(),
        password: '',
        persona: 'expert',
        groupIds: ['c1'],
      },
    });
    expect(r.status).toBe(409);
    const err = await errorOf(r);
    expect(err.message).toBe('Email đã được sử dụng cho tài khoản khác');
    expect(err.fields).toEqual([
      { path: 'email', message: 'Email đã được sử dụng cho tài khoản khác' },
    ]);
  });
});
