import { apiErrorSchema, loginResponseSchema, meSchema } from '@opchub/shared/api';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

const OTP = '123456';
let n = 0;
const uniqueEmail = () => `reg4-${Date.now().toString(36)}-${(n += 1)}@test.opchub.vn`;

/**
 * D-89 (prototype v4): form đăng ký chỉ còn liên hệ + mật khẩu; vai trò, MST, ngành, nhóm
 * khai báo ở popup sau đăng nhập (`PUT /me/declaration`, V4-607).
 */
describe('đăng ký v4 (TIP-V4-617)', () => {
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

  const post = (path: string, json: unknown) => t.call(path, { method: 'POST', json });
  const activate = async (email: string) => {
    const ok = await post('/auth/otp/verify', { email, code: OTP });
    expect(ok.status).toBe(200);
    return loginResponseSchema.parse(await ok.json());
  };

  it('cá nhân không vai trò / nhóm → 202; kích hoạt → chưa vào nhóm, cần khai báo', async () => {
    const email = uniqueEmail();
    const res = await post('/auth/register/personal', {
      fullName: 'Người Đăng Ký',
      phone: { country: 'vn', number: '' },
      email,
      password: '',
      agreeTerms: true,
    });
    expect(res.status).toBe(202);
    const body = await activate(email);
    expect(body.me.needsDeclaration).toBe(true);
    const user = await t.prisma.db.user.findUniqueOrThrow({
      where: { email },
      select: { id: true, registrationRole: true },
    });
    expect(user.registrationRole).toBeNull();
    expect(await t.prisma.db.groupMember.count({ where: { userId: user.id } })).toBe(0);
  });

  it('DN thiếu người đại diện → 400 tại ô representative, không gửi OTP', async () => {
    const email = uniqueEmail();
    const res = await post('/auth/register/business', {
      representative: '  ',
      position: '',
      phone: { country: 'vn', number: '' },
      email,
      password: '',
      agreeTerms: true,
    });
    expect(res.status).toBe(400);
    const err = apiErrorSchema.parse(await res.json());
    expect(err.error.fields).toContainEqual({
      path: 'representative',
      message: 'Vui lòng nhập họ tên người đại diện',
    });
    expect(await t.prisma.db.mailLog.count({ where: { to: email } })).toBe(0);
  });

  it('DN không MST → TK business chưa có hồ sơ DN; khai báo tạo hồ sơ + vào nhóm', async () => {
    const email = uniqueEmail();
    const res = await post('/auth/register/business', {
      representative: 'Nguyễn Văn An',
      position: 'Giám đốc',
      phone: { country: 'vn', number: '' },
      email,
      password: '',
      agreeTerms: true,
    });
    expect(res.status).toBe(202);
    const body = await activate(email);
    expect(body.me.accountType).toBe('business');
    expect(body.me.needsDeclaration).toBe(true);
    const user = await t.prisma.db.user.findUniqueOrThrow({
      where: { email },
      select: { id: true, fullName: true, position: true },
    });
    expect(user).toMatchObject({ fullName: 'Nguyễn Văn An', position: 'Giám đốc' });
    expect(await t.prisma.db.businessProfile.count({ where: { userId: user.id } })).toBe(0);

    const draft = await t.call('/me/declaration', { token: body.accessToken });
    expect(await draft.json()).toMatchObject({ business: null, groupIds: [] });
    const saved = await t.call('/me/declaration', {
      method: 'PUT',
      token: body.accessToken,
      json: {
        accountType: 'business',
        taxCode: '0101234567',
        companyName: 'CÔNG TY TNHH GIẢI PHÁP MEDIASOFT',
        mainIndustry: '6201 – Lập trình máy vi tính',
        size: '10',
        province: 'Hà Nội',
        groupIds: ['c1'],
      },
    });
    expect(saved.status).toBe(200);
    expect(meSchema.parse(await saved.json()).needsDeclaration).toBe(false);
    const biz = await t.prisma.db.businessProfile.findUniqueOrThrow({
      where: { userId: user.id },
      select: { taxCode: true, representative: true, verification: true },
    });
    expect(biz.taxCode).toBe('0101234567');
    expect(biz.verification).toBe('verified');
    expect(
      await t.prisma.db.groupMember.count({ where: { userId: user.id, status: 'member' } }),
    ).toBe(1);
  });
});
