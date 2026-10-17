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

  it('PATCH email trùng TK khác → 409; email của chính mình → 200', async () => {
    const a = await createUser(t, { fee: 'active' });
    const b = await createUser(t, { fee: 'active' });
    const token = await tokenOf(a.email, a.password);
    const dup = await patch(token, { email: b.email });
    expect(dup.status).toBe(409);
    expect(apiErrorSchema.parse(await dup.json()).error.fields?.[0]?.path).toBe('email');
    expect((await patch(token, { email: a.email.toUpperCase() })).status).toBe(200);
  });

  it('PATCH body rỗng → 400', async () => {
    const u = await createUser(t, { fee: 'active' });
    expect((await patch(await tokenOf(u.email, u.password), {})).status).toBe(400);
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
});
