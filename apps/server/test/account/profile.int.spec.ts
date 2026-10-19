import { apiErrorSchema, loginResponseSchema, meSchema } from '@opchub/shared/api';
import { profileSchema } from '@opchub/shared/api-domains';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

describe('hồ sơ /me, gợi ý thành viên, SSO, presign (TIP-B13)', () => {
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

  const tokenOf = async (email: string, password: string) => {
    const res = await t.call('/auth/login', {
      method: 'POST',
      json: { identifier: email, password },
    });
    return loginResponseSchema.parse(await res.json()).accessToken;
  };
  const patch = (token: string, json: unknown) => t.call('/me', { method: 'PATCH', token, json });

  /** DN đã xác minh MST (D-40) */
  async function bizUser() {
    const u = await createUser(t, { accountType: 'business', fee: 'active' });
    await t.prisma.db.businessProfile.create({
      data: {
        userId: u.id,
        taxCode: '0101234567',
        companyName: 'Công ty TNHH Giải pháp MediaSoft',
        representative: 'Nguyễn Văn An',
        position: 'Giám đốc',
        mainField: 'Phần mềm',
        subFields: [],
        verification: 'verified',
      },
    });
    return u;
  }

  it('GET /me khớp profileSchema và vẫn là meSchema (tương thích ngược)', async () => {
    const u = await bizUser();
    const res = await t.call('/me', { token: await tokenOf(u.email, u.password) });
    expect(res.status).toBe(200);
    const json: unknown = await res.json();
    const p = profileSchema.parse(json);
    meSchema.parse(json);
    expect(p.phone.country).toBe('vn');
    expect(p.phone.number).toBe(u.phone.slice(3));
    expect(p.business).toMatchObject({ taxCode: '0101234567', verification: 'verified' });
    expect(p.stats).toEqual({ groups: 0, events: 0, projects: 0 });
  });

  it('PATCH city/fullName → 200; MST khi verified → 403; gửi lại MST cũ + website → 200', async () => {
    const u = await bizUser();
    const token = await tokenOf(u.email, u.password);
    const ok = profileSchema.parse(
      await (await patch(token, { city: 'Hà Nội', fullName: 'Nguyễn Văn Bình' })).json(),
    );
    expect(ok).toMatchObject({ city: 'Hà Nội', fullName: 'Nguyễn Văn Bình' });

    const locked = await patch(token, { business: { taxCode: '0109999999' } });
    expect(locked.status).toBe(403);
    expect(apiErrorSchema.parse(await locked.json()).error.message).toBe(
      'Mã số thuế và tên doanh nghiệp chỉ thay đổi được qua quản trị viên',
    );

    const same = await patch(token, {
      business: { taxCode: '0101234567', website: 'https://mediasoft.vn' },
    });
    expect(same.status).toBe(200);
    expect(profileSchema.parse(await same.json()).business?.website).toBe('https://mediasoft.vn');
  });

  it('BUG-030 QT-01 PATCH /me có email → 400 "Đổi email cần xác nhận OTP", email không đổi', async () => {
    const u = await createUser(t, { fee: 'active' });
    const token = await tokenOf(u.email, u.password);
    const r = await patch(token, { email: `khac-${u.email}`, city: 'Huế' });
    expect(r.status).toBe(400);
    const err = apiErrorSchema.parse(await r.json()).error;
    expect(err.fields?.find((f) => f.path === 'email')?.message).toBe('Đổi email cần xác nhận OTP');
    const row = await t.prisma.db.user.findUniqueOrThrow({
      where: { id: u.id },
      select: { email: true, city: true },
    });
    expect(row).toEqual({ email: u.email, city: '' });
  });

  const OTP = '123456'; // OTP_FIXED_CODE (setup/env.ts)
  const post = (path: string, token: string, json: unknown) =>
    t.call(path, { method: 'POST', token, json });
  const loginRaw = (identifier: string, password: string) =>
    t.call('/auth/login', { method: 'POST', json: { identifier, password } });
  const cookieOf = (res: Response) =>
    res.headers
      .getSetCookie()
      .find((c) => c.startsWith('opchub_rt='))
      ?.split(';')[0]
      ?.slice('opchub_rt='.length) ?? '';
  const newEmailOf = (tag: string) => `moi-${tag}-${Date.now().toString(36)}@test.opchub.vn`;

  it('BUG-030 QT-01 đổi email cần OTP gửi tới email mới; đăng nhập bằng email mới, phiên khác bị thu hồi', async () => {
    const u = await createUser(t, { fee: 'active' });
    const token = await tokenOf(u.email, u.password);
    const other = cookieOf(await loginRaw(u.email, u.password));
    const newEmail = newEmailOf('ok');

    const sent = await post('/me/email/otp', token, { newEmail: newEmail.toUpperCase() });
    expect(sent.status).toBe(200);
    expect(await sent.json()).toEqual({ email: newEmail, expiresInSec: 600 });
    // OTP gửi tới email MỚI, không tới email cũ; email chưa đổi khi chưa xác nhận
    const otpMail = await t.prisma.db.mailLog.findMany({
      where: { kind: 'otp', to: { in: [newEmail, u.email] } },
      select: { to: true },
    });
    expect(otpMail).toEqual([{ to: newEmail }]);
    expect((await loginRaw(u.email, u.password)).status).toBe(200);

    const done = await post('/me/email/verify', token, { newEmail, code: OTP });
    expect(done.status).toBe(200);
    expect(profileSchema.parse(await done.json()).email).toBe(newEmail);
    // Thiết bị đang thao tác nhận chuỗi refresh mới
    expect(cookieOf(done)).not.toBe('');
    const row = await t.prisma.db.user.findUniqueOrThrow({
      where: { id: u.id },
      select: { email: true, emailVerifiedAt: true },
    });
    expect(row.email).toBe(newEmail);
    expect(row.emailVerifiedAt).not.toBeNull();
    // Thông báo tới email cũ
    expect(await t.prisma.db.mailLog.count({ where: { to: u.email } })).toBe(1);

    expect((await loginRaw(newEmail, u.password)).status).toBe(200);
    expect((await loginRaw(u.email, u.password)).status).toBe(401);
    const refreshOld = await t.call('/auth/refresh', {
      method: 'POST',
      headers: { Cookie: `opchub_rt=${other}`, Origin: 'http://localhost:3000' },
    });
    expect(refreshOld.status).toBe(401);
  });

  it('BUG-030 OTP sai → 422 OTP_INVALID, sai 5 lần → 429; mã của TK khác không dùng được', async () => {
    const u = await createUser(t, { fee: 'active' });
    const token = await tokenOf(u.email, u.password);
    const newEmail = newEmailOf('sai');
    expect((await post('/me/email/otp', token, { newEmail })).status).toBe(200);
    for (let i = 0; i < 4; i += 1) {
      const r = await post('/me/email/verify', token, { newEmail, code: '000000' });
      expect(r.status).toBe(422);
      expect(apiErrorSchema.parse(await r.json()).error.code).toBe('OTP_INVALID');
    }
    const fifth = await post('/me/email/verify', token, { newEmail, code: '000000' });
    expect(fifth.status).toBe(429);
    // Đã khoá: mã đúng cũng 429 tới khi gửi mã mới
    expect((await post('/me/email/verify', token, { newEmail, code: OTP })).status).toBe(429);
    const row = await t.prisma.db.user.findUniqueOrThrow({
      where: { id: u.id },
      select: { email: true },
    });
    expect(row.email).toBe(u.email);

    // Purpose gắn user: TK khác không xác nhận được email mới của TK này
    const b = await createUser(t, { fee: 'active' });
    const tb = await tokenOf(b.email, b.password);
    expect((await post('/me/email/otp', token, { newEmail })).status).toBe(200);
    expect((await post('/me/email/verify', tb, { newEmail, code: OTP })).status).toBe(422);
    expect((await post('/me/email/verify', token, { newEmail, code: OTP })).status).toBe(200);
  });

  it('BUG-030 QT-01 email mới thuộc TK khác → 409 newEmail; trùng email hiện tại → 400; sai định dạng → 400', async () => {
    const a = await createUser(t, { fee: 'active' });
    const b = await createUser(t, { fee: 'active' });
    const token = await tokenOf(a.email, a.password);
    const dup = await post('/me/email/otp', token, { newEmail: b.email.toUpperCase() });
    expect(dup.status).toBe(409);
    expect(apiErrorSchema.parse(await dup.json()).error.fields?.[0]?.path).toBe('newEmail');
    expect((await post('/me/email/otp', token, { newEmail: a.email })).status).toBe(400);
    expect((await post('/me/email/otp', token, { newEmail: 'sai' })).status).toBe(400);

    // Email bị TK khác lấy sau khi đã gửi mã → verify 409, email không đổi
    const newEmail = newEmailOf('race');
    expect((await post('/me/email/otp', token, { newEmail })).status).toBe(200);
    await t.prisma.db.user.update({ where: { id: b.id }, data: { email: newEmail } });
    const late = await post('/me/email/verify', token, { newEmail, code: OTP });
    expect(late.status).toBe(409);
    expect(apiErrorSchema.parse(await late.json()).error.fields?.[0]?.path).toBe('newEmail');
  });

  it('PATCH body rỗng → 400', async () => {
    const u = await createUser(t, { fee: 'active' });
    expect((await patch(await tokenOf(u.email, u.password), {})).status).toBe(400);
  });

  it('BUG-030 NA-17 chặn huỷ SSO cuối khi chưa có mật khẩu; đặt mật khẩu xong → 200', async () => {
    const u = await createUser(t, { fee: 'active' });
    const token = await tokenOf(u.email, u.password);
    // TK chỉ đăng nhập qua SSO: bỏ mật khẩu sau khi lấy token, liên kết đúng 1 provider
    await t.prisma.db.user.update({ where: { id: u.id }, data: { passwordHash: null } });
    await t.call('/me/sso/google', { method: 'POST', token });
    const p = profileSchema.parse(await (await t.call('/me', { token })).json());
    expect(p).toMatchObject({ hasPassword: false, linkedSso: ['google'] });

    const blocked = await t.call('/me/sso/google', { method: 'DELETE', token });
    expect(blocked.status).toBe(409);
    expect(apiErrorSchema.parse(await blocked.json()).error.message).toBe(
      'Đặt mật khẩu trước khi huỷ liên kết cuối cùng',
    );
    expect(await t.prisma.db.authIdentity.count({ where: { userId: u.id } })).toBe(1);

    // Còn liên kết khác → huỷ được một cái, cái cuối lại bị chặn
    await t.call('/me/sso/facebook', { method: 'POST', token });
    expect((await t.call('/me/sso/facebook', { method: 'DELETE', token })).status).toBe(200);
    expect((await t.call('/me/sso/google', { method: 'DELETE', token })).status).toBe(409);

    // Đặt mật khẩu → huỷ liên kết cuối được
    const hash = await t.prisma.db.user.findFirstOrThrow({
      where: { passwordHash: { not: null } },
      select: { passwordHash: true },
    });
    await t.prisma.db.user.update({
      where: { id: u.id },
      data: { passwordHash: hash.passwordHash },
    });
    const ok = await t.call('/me/sso/google', { method: 'DELETE', token });
    expect(ok.status).toBe(200);
    const after = profileSchema.parse(await (await t.call('/me', { token })).json());
    expect(after).toMatchObject({ hasPassword: true, linkedSso: [] });
  });

  it('SSO liên kết / huỷ → linkedSso cập nhật', async () => {
    const u = await createUser(t, { fee: 'active' });
    const token = await tokenOf(u.email, u.password);
    const r = await t.call('/me/sso/facebook', { method: 'POST', token });
    expect(await r.json()).toEqual({ provider: 'facebook', linked: true });
    let p = profileSchema.parse(await (await t.call('/me', { token })).json());
    expect(p.linkedSso).toEqual(['facebook']);
    await t.call('/me/sso/facebook', { method: 'DELETE', token });
    p = profileSchema.parse(await (await t.call('/me', { token })).json());
    expect(p.linkedSso).toEqual([]);
    expect((await t.call('/me/sso/myspace', { method: 'POST', token })).status).toBe(404);
  });

  it('members/suggest: tìm không dấu, ≤ 10, chỉ thành viên active; cần phí', async () => {
    const tag = `Zq${Date.now().toString(36)}`;
    const u = await createUser(t, { fee: 'active' });
    await t.prisma.db.user.update({
      where: { id: u.id },
      data: { fullName: `Nguyễn ${tag}`, registrationRole: 'expert' },
    });
    const locked = await createUser(t, { status: 'locked' });
    await t.prisma.db.user.update({ where: { id: locked.id }, data: { fullName: `Lê ${tag}` } });

    const token = await tokenOf(u.email, u.password);
    const res = await t.call(`/members/suggest?q=${encodeURIComponent(`nguyen ${tag}`)}`, {
      token,
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: { name: string; subtitle: string }[] };
    expect(body.items).toEqual([
      { name: `Nguyễn ${tag}`, subtitle: 'Chuyên gia', avatarUrl: null },
    ]);

    const unpaid = await createUser(t, { fee: 'pending_payment' });
    const r402 = await t.call('/members/suggest?q=ab', {
      token: await tokenOf(unpaid.email, unpaid.password),
    });
    expect(r402.status).toBe(402);
  });

  it('uploads/presign: URL PUT có chữ ký + publicUrl theo user; sai kiểu → 400', async () => {
    const u = await createUser(t, { fee: 'pending_payment' });
    const token = await tokenOf(u.email, u.password);
    const res = await t.call('/uploads/presign', {
      method: 'POST',
      token,
      json: { kind: 'avatar', contentType: 'image/png', size: 1024 },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { uploadUrl: string; publicUrl: string };
    expect(body.uploadUrl).toMatch(/X-Amz-Signature=/);
    expect(body.publicUrl).toContain(`/avatar/${u.id}/`);
    const bad = await t.call('/uploads/presign', {
      method: 'POST',
      token,
      json: { kind: 'avatar', contentType: 'image/gif', size: 1024 },
    });
    expect(bad.status).toBe(400);
  });

  it('REQ-226 presign chat-file pdf ≤10MB; svg → 400; chưa đóng phí → 402', async () => {
    const u = await createUser(t, { fee: 'active' });
    const token = await tokenOf(u.email, u.password);
    const presign = (json: unknown, tk = token) =>
      t.call('/uploads/presign', { method: 'POST', token: tk, json });
    const ok = await presign({
      kind: 'chat-file',
      contentType: 'application/pdf',
      size: 10 * 1024 * 1024,
    });
    expect(ok.status).toBe(200);
    const body = (await ok.json()) as { publicUrl: string };
    // Khoá server sinh (không dùng tên tệp), đuôi theo MIME
    expect(body.publicUrl).toMatch(new RegExp(`/chat-file/${u.id}/[0-9a-f-]{36}[.]pdf$`));
    expect(
      (
        await presign({
          kind: 'chat-file',
          contentType: 'application/pdf',
          size: 10 * 1024 * 1024 + 1,
        })
      ).status,
    ).toBe(400);
    expect(
      (await presign({ kind: 'chat-file', contentType: 'image/svg+xml', size: 100 })).status,
    ).toBe(400);
    expect(
      (await presign({ kind: 'chat-image', contentType: 'application/pdf', size: 100 })).status,
    ).toBe(400);
    const unpaid = await createUser(t, { fee: 'pending_payment' });
    const tk = await tokenOf(unpaid.email, unpaid.password);
    expect(
      (await presign({ kind: 'chat-image', contentType: 'image/png', size: 100 }, tk)).status,
    ).toBe(402);
    // Ảnh đại diện vẫn đổi được khi chưa đóng phí
    expect(
      (await presign({ kind: 'avatar', contentType: 'image/png', size: 100 }, tk)).status,
    ).toBe(200);
  });
});
