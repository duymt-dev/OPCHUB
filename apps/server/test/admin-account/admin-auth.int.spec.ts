import {
  adminLoginResponseSchema,
  adminMeSchema,
  adminTwoFactorSetupSchema,
  apiErrorSchema,
  loginResponseSchema,
} from '@opchub/shared/api';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { base32 } from '@/modules/account';
import { totpAt } from '@/modules/account/domain/totp';
import { tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { ssoLogin } from '../factories/sso.factory';
import { createTestApp, setAdmin2faRequired, type TestApp } from '../setup/test-app';
import { cleanupAdminAccounts, roleIds, uniqueAdminEmail } from './helpers';

const ORIGIN = 'http://localhost:3001';
const TEMP_PWD = 'TamThoi@2026';

/** Giải base32 (RFC 4648) của secret trong otpauth URL → mã 6 số hiện hành */
function codeOf(otpauthUrl: string, at = new Date()): string {
  const b32 = /secret=([A-Z2-7]+)/.exec(otpauthUrl)?.[1] ?? '';
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const c of b32) bits += A.indexOf(c).toString(2).padStart(5, '0');
  const bytes = bits.match(/.{8}/g)?.map((b) => parseInt(b, 2)) ?? [];
  const secret = Buffer.from(bytes);
  expect(base32(secret)).toBe(b32);
  return totpAt(secret, at);
}

describe('Đăng nhập Admin qua admin_users (TIP-V2-202, D-62, SEC-R01…R03)', () => {
  let t: TestApp;
  let roles: Record<string, string>;
  let owner: string;

  const post = (path: string, json?: unknown, token?: string, cookie?: string) =>
    t.call(path, {
      method: 'POST',
      ...(json !== undefined ? { json } : {}),
      ...(token ? { token } : {}),
      headers: { Origin: ORIGIN, ...(cookie ? { Cookie: `opchub_art=${cookie}` } : {}) },
    });
  const adminLogin = (email: string, password: string) =>
    post('/admin/auth/login', { identifier: email, password });
  const errorOf = async (r: Response) => apiErrorSchema.parse(await r.json()).error;
  const cookieOf = (r: Response) =>
    r.headers
      .getSetCookie()
      .find((c) => c.startsWith('opchub_art='))
      ?.split(';')[0]
      ?.slice('opchub_art='.length);

  /** TK quản trị mới với mật khẩu tạm (QT-RB-01) */
  const newAdmin = async () => {
    const email = uniqueAdminEmail();
    const r = await t.call('/admin/admin-accounts', {
      method: 'POST',
      token: owner,
      json: { name: 'Nhân Sự Mới', email, roleId: roles.lecturer, password: TEMP_PWD },
    });
    expect(r.status).toBe(201);
    return email;
  };

  beforeAll(async () => {
    t = await createTestApp();
    roles = await roleIds(t);
  });
  beforeEach(async () => {
    await flushAuthState(t);
    await setAdmin2faRequired(t.prisma, t.redis, false);
    owner = await tokenOf(t, await createUser(t, { systemRole: 'super_admin' }));
  });
  afterAll(async () => {
    await setAdmin2faRequired(t.prisma, t.redis, false);
    await cleanupAdminAccounts(t);
    await t.close();
  });

  it('AT-SEC01 MK tạm → phiên hạn chế', async () => {
    const email = await newAdmin();
    const r = await adminLogin(email, TEMP_PWD);
    expect(r.status).toBe(200);
    const s = adminLoginResponseSchema.parse(await r.json());
    expect(s.admin).toMatchObject({ email, mustChangePassword: true, roleName: 'Giảng viên' });
    expect(cookieOf(r)).toBeTruthy();
    const ov = await t.call('/admin/overview', { token: s.accessToken });
    expect(ov.status).toBe(403);
    expect((await errorOf(ov)).code).toBe('PASSWORD_CHANGE_REQUIRED');
    // me + đổi mật khẩu dùng được trong phiên hạn chế
    const me = await t.call('/admin/auth/me', { token: s.accessToken });
    expect(adminMeSchema.parse(await me.json()).mustChangePassword).toBe(true);
    // Chưa đổi mật khẩu thì chưa được thiết lập 2FA (thứ tự §22.2)
    expect((await post('/admin/auth/2fa/setup', undefined, s.accessToken)).status).toBe(403);
  });

  it('AT-SEC01 MK yếu/không khớp/trùng MK tạm bị từ chối', async () => {
    const email = await newAdmin();
    const s = adminLoginResponseSchema.parse(await (await adminLogin(email, TEMP_PWD)).json());
    const change = (newPassword: string, confirmPassword = newPassword) =>
      post('/admin/auth/first-password', { newPassword, confirmPassword }, s.accessToken);
    for (const [pwd, confirm, path, message] of [
      [
        'abc12345',
        'abc12345',
        'newPassword',
        'Mật khẩu mới tối thiểu 8 ký tự, có chữ hoa và chữ số',
      ],
      ['MoiMoi@2026', 'MoiMoi@2027', 'confirmPassword', 'Mật khẩu nhập lại không khớp'],
      [TEMP_PWD, TEMP_PWD, 'newPassword', 'Mật khẩu mới phải khác mật khẩu tạm'],
    ] as const) {
      const r = await change(pwd, confirm);
      expect(r.status).toBe(400);
      expect((await errorOf(r)).fields).toEqual([{ path, message }]);
    }
    const ok = await change('MoiMoi@2026');
    expect(ok.status).toBe(200);
    const fresh = adminLoginResponseSchema.parse(await ok.json());
    expect(fresh.admin.mustChangePassword).toBe(false);
    expect((await t.call('/admin/overview', { token: fresh.accessToken })).status).toBe(200);
    // Token hạn chế cũ hết hiệu lực (version tăng)
    expect((await t.call('/admin/auth/me', { token: s.accessToken })).status).toBe(401);
    expect((await adminLogin(email, TEMP_PWD)).status).toBe(401);
    expect((await adminLogin(email, 'MoiMoi@2026')).status).toBe(200);
    expect(
      await t.prisma.db.auditLog.count({
        where: { action: 'admin_account.first_password', tag: 'permission' },
      }),
    ).toBeGreaterThanOrEqual(1);
  });

  it('AT-RB04 TK khoá không đăng nhập được', async () => {
    const u = await createUser(t, { systemRole: 'admin', status: 'locked' });
    const wrong = await adminLogin(u.email, 'Sai@2026pass');
    expect(wrong.status).toBe(401);
    const r = await adminLogin(u.email, u.password);
    expect(r.status).toBe(403);
    expect((await errorOf(r)).message).toBe('Tài khoản quản trị đã bị khóa');
    expect(cookieOf(r)).toBeUndefined();
  });

  it('REQ-215 khoá tạm 5 lần sai TK quản trị', async () => {
    const u = await createUser(t, { systemRole: 'admin' });
    for (let i = 0; i < 5; i += 1) {
      expect((await adminLogin(u.email, 'Sai@2026pass')).status).toBe(401);
    }
    const r = await adminLogin(u.email, u.password);
    expect(r.status).toBe(429);
    expect(Number(r.headers.get('retry-after'))).toBeGreaterThan(0);
  });

  it('REQ-201 realm member gọi /admin 403, realm admin gọi Portal 403', async () => {
    const m = await createUser(t, { fee: 'active' });
    const memberTk = await tokenOf(t, m);
    const a = await createUser(t, { systemRole: 'admin' });
    const adminTk = await tokenOf(t, a);
    const toAdmin = await t.call('/admin/overview', { token: memberTk });
    expect(toAdmin.status).toBe(403);
    expect((await errorOf(toAdmin)).code).toBe('WRONG_PORTAL');
    const toPortal = await t.call('/me', { token: adminTk });
    expect(toPortal.status).toBe(403);
    expect((await errorOf(toPortal)).code).toBe('WRONG_PORTAL');
    // Route dùng chung (D-29 thông báo) nhận cả hai
    expect((await t.call('/notifications', { token: adminTk })).status).toBe(200);
    expect((await t.call('/notifications', { token: memberTk })).status).toBe(200);
  });

  it('NA-01 D-62 đăng nhập sai cổng: chỉ báo WRONG_PORTAL khi mật khẩu đúng, không tạo phiên', async () => {
    const m = await createUser(t, { fee: 'active' });
    expect((await adminLogin(m.email, 'Sai@2026pass')).status).toBe(401);
    const wrong = await adminLogin(m.email, m.password);
    expect(wrong.status).toBe(403);
    expect((await errorOf(wrong)).code).toBe('WRONG_PORTAL');
    expect(cookieOf(wrong)).toBeUndefined();

    const a = await createUser(t, { systemRole: 'admin' });
    const portal = await post('/auth/login', { identifier: a.email, password: a.password });
    expect(portal.status).toBe(403);
    expect((await errorOf(portal)).code).toBe('WRONG_PORTAL');
    expect(portal.headers.getSetCookie().some((c) => c.startsWith('opchub_rt='))).toBe(false);
  });

  it('REQ-217 SSO email quản trị 409', async () => {
    const a = await createUser(t, { systemRole: 'admin' });
    const r = await ssoLogin(t, 'google', a.email);
    expect(r.status).toBe(409);
    expect((await errorOf(r)).message).toBe('Tài khoản quản trị không đăng nhập bằng SSO');
  });

  it('refresh xoay vòng bằng cookie opchub_art; logout thu hồi + audit', async () => {
    const a = await createUser(t, { systemRole: 'admin' });
    const r = await adminLogin(a.email, a.password);
    const c1 = cookieOf(r) ?? '';
    const ref = await post('/admin/auth/refresh', undefined, undefined, c1);
    expect(ref.status).toBe(200);
    expect(adminLoginResponseSchema.parse(await ref.json()).admin.id).toBe(a.id);
    const c2 = cookieOf(ref) ?? '';
    expect(c2).not.toBe(c1);
    // Cookie thành viên không dùng được ở refresh Admin
    const asMember = await t.call('/auth/refresh', {
      method: 'POST',
      headers: { Origin: ORIGIN, Cookie: `opchub_rt=${c2}` },
    });
    expect(asMember.status).toBe(401);
    expect((await post('/admin/auth/logout', undefined, undefined, c2)).status).toBe(204);
    expect((await post('/admin/auth/refresh', undefined, undefined, c2)).status).toBe(401);
    const actions = await t.prisma.db.auditLog.findMany({
      where: { actorId: a.id, action: { in: ['admin_auth.login', 'admin_auth.logout'] } },
      select: { action: true },
    });
    expect(new Set(actions.map((x) => x.action))).toEqual(
      new Set(['admin_auth.login', 'admin_auth.logout']),
    );
  });

  it('REQ-352 bật 2FA rồi đăng nhập cần mã', async () => {
    const a = await createUser(t, { systemRole: 'admin' });
    const tk = await tokenOf(t, a);
    const setup = adminTwoFactorSetupSchema.parse(
      await (await post('/admin/auth/2fa/setup', undefined, tk)).json(),
    );
    expect(setup.secretMasked).toContain('••••');
    expect((await post('/admin/auth/2fa/enable', { code: '000000' }, tk)).status).toBe(400);
    const en = await post('/admin/auth/2fa/enable', { code: codeOf(setup.otpauthUrl) }, tk);
    expect(en.status).toBe(200);
    expect(adminLoginResponseSchema.parse(await en.json()).admin.twoFactor).toBe(true);
    const row = await t.prisma.db.adminUser.findUniqueOrThrow({
      where: { id: a.id },
      select: { totpSecretEnc: true },
    });
    const b32 = /secret=([A-Z2-7]+)/.exec(setup.otpauthUrl)?.[1] ?? '';
    expect(Buffer.from(row.totpSecretEnc ?? []).toString('utf8')).not.toContain(b32);

    const first = await adminLogin(a.email, a.password);
    expect(first.status).toBe(401);
    const err = await errorOf(first);
    const mfaToken = err.fields?.find((f) => f.path === 'mfaToken')?.message ?? '';
    expect(mfaToken).not.toBe('');
    expect((await post('/admin/auth/totp/verify', { mfaToken, code: '000000' })).status).toBe(401);
    // Mã của bước 30 giây kế tiếp (mã vừa dùng để bật không dùng lại được)
    const next = codeOf(setup.otpauthUrl, new Date(Date.now() + 30_000));
    const ok = await post('/admin/auth/totp/verify', { mfaToken, code: next });
    expect(ok.status).toBe(200);
    expect(adminLoginResponseSchema.parse(await ok.json()).admin.id).toBe(a.id);
  });

  it('REQ-352 requireAdmin2fa bắt thiết lập', async () => {
    await setAdmin2faRequired(t.prisma, t.redis, true);
    const a = await createUser(t, { systemRole: 'admin' });
    const r = await adminLogin(a.email, a.password);
    expect(r.status).toBe(200);
    const s = adminLoginResponseSchema.parse(await r.json());
    expect(s.admin).toMatchObject({ twoFactor: false, twoFactorRequired: true });
    const ov = await t.call('/admin/overview', { token: s.accessToken });
    expect(ov.status).toBe(403);
    expect((await errorOf(ov)).code).toBe('TWO_FACTOR_SETUP_REQUIRED');
    const setup = adminTwoFactorSetupSchema.parse(
      await (await post('/admin/auth/2fa/setup', undefined, s.accessToken)).json(),
    );
    const en = await post(
      '/admin/auth/2fa/enable',
      { code: codeOf(setup.otpauthUrl) },
      s.accessToken,
    );
    const fresh = adminLoginResponseSchema.parse(await en.json());
    expect(fresh.admin.twoFactorRequired).toBe(false);
    expect((await t.call('/admin/overview', { token: fresh.accessToken })).status).toBe(200);
  });

  it('Portal vẫn đăng nhập thành viên bình thường (không đổi hợp đồng loginResponse)', async () => {
    const m = await createUser(t, { fee: 'active' });
    const r = await post('/auth/login', { identifier: m.email, password: m.password });
    expect(loginResponseSchema.parse(await r.json()).me.id).toBe(m.id);
  });
});
