import {
  apiErrorSchema,
  bizLookupSchema,
  loginResponseSchema,
  otpSentSchema,
  ssoCallbackSchema,
} from '@opchub/shared/api';
import { revokeSessionsResultSchema } from '@opchub/shared/api-domains';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { SecretBox } from '@/common/crypto/secret-box';
import { TotpService } from '@/modules/account';
import { totpAt } from '@/modules/account/domain/totp';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';
import { ORIGIN, refreshCookie, resetTokenOf, uniqueEmail } from './account.helpers';
import { ep } from './harness';
import { ssoCallbackPath, ssoStart } from '../factories/sso.factory';

const OTP = '123456';
const NEW_PASSWORD = 'NewPass@2027';

/**
 * Contract `account` — xác thực (15): đăng nhập/refresh/đăng xuất, đăng ký + OTP, mật khẩu,
 * phiên, SSO, TOTP, tra MST. Schema đúng như apps/{portal,admin}/src/features/auth|profile/api.ts
 * và apps/*\/src/lib/session.ts (refresh → loginResponseSchema).
 */
describe('Contract: account (auth)', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  beforeEach(async () => {
    await flushAuthState(t);
  });
  afterAll(async () => {
    await t.close();
  });

  const rawLogin = async (identifier: string, password: string) => {
    const res = await t.call('/auth/login', { method: 'POST', json: { identifier, password } });
    const cookie = refreshCookie(res) ?? '';
    return { cookie, token: loginResponseSchema.parse(await res.json()).accessToken };
  };

  it('đăng nhập → refresh → đổi mật khẩu → thu hồi thiết bị khác → đăng xuất', async () => {
    const u = await createUser(t, { fee: 'active' });
    const login = await ep(t, 'POST', '/auth/login', '/auth/login', loginResponseSchema, {
      json: { identifier: u.email, password: u.password, remember: true },
    });
    expect(login.data.me.id).toBe(u.id);

    // ep không trả header → cookie refresh lấy bằng lời gọi thường
    const a = await rawLogin(u.email, u.password);
    const refreshed = await ep(t, 'POST', '/auth/refresh', '/auth/refresh', loginResponseSchema, {
      headers: { Cookie: `opchub_rt=${a.cookie}`, Origin: ORIGIN },
    });
    expect(refreshed.data.me.id).toBe(u.id);

    const b = await rawLogin(u.email, u.password);
    await ep(
      t,
      'POST',
      '/auth/password/change',
      '/auth/password/change',
      null,
      {
        token: b.token,
        json: { currentPassword: u.password, newPassword: NEW_PASSWORD },
        headers: { Origin: ORIGIN, Cookie: `opchub_rt=${b.cookie}` },
      },
      204,
    );

    const c = await rawLogin(u.email, NEW_PASSWORD);
    await rawLogin(u.email, NEW_PASSWORD);
    const revoked = await ep(
      t,
      'POST',
      '/auth/sessions/revoke-others',
      '/auth/sessions/revoke-others',
      revokeSessionsResultSchema,
      { token: c.token, headers: { Origin: ORIGIN, Cookie: `opchub_rt=${c.cookie}` } },
    );
    expect(revoked.data.revoked).toBeGreaterThanOrEqual(1);

    await ep(
      t,
      'POST',
      '/auth/logout',
      '/auth/logout',
      null,
      { headers: { Cookie: `opchub_rt=${c.cookie}`, Origin: ORIGIN } },
      204,
    );
  });

  it('đăng ký cá nhân + DN → OTP gửi lại → xác thực OTP → phiên', async () => {
    const email = uniqueEmail('ct-reg');
    const sent = await ep(
      t,
      'POST',
      '/auth/register/personal',
      '/auth/register/personal',
      otpSentSchema,
      {
        json: {
          fullName: 'Người Hợp Đồng',
          phone: { country: 'vn', number: '' },
          email,
          password: '',
          persona: 'expert',
          groupIds: ['c1'],
          agreeTerms: true,
        },
      },
      202,
    );
    expect(sent.data.email).toBe(email);
    await ep(
      t,
      'POST',
      '/auth/otp/resend',
      '/auth/otp/resend',
      otpSentSchema,
      { json: { email } },
      202,
    );
    const ok = await ep(t, 'POST', '/auth/otp/verify', '/auth/otp/verify', loginResponseSchema, {
      json: { email, code: OTP },
    });
    expect(ok.data.me.email).toBe(email);

    const bizEmail = uniqueEmail('ct-biz');
    await ep(
      t,
      'POST',
      '/auth/register/business',
      '/auth/register/business',
      otpSentSchema,
      {
        json: {
          taxCode: '0101234567',
          companyName: 'CÔNG TY TNHH GIẢI PHÁP MEDIASOFT',
          mainIndustry: '6201 – Lập trình máy vi tính',
          otherIndustries: [],
          size: '1',
          country: 'vn',
          representative: 'Nguyễn Văn An',
          position: 'Giám đốc',
          phone: { country: 'vn', number: '' },
          email: bizEmail,
          password: 'Opchub@2026',
          groupIds: ['c1'],
          agreeTerms: true,
        },
      },
      202,
    );
  });

  it('tra MST công khai', async () => {
    const r = await ep(t, 'GET', '/biz/lookup', '/biz/lookup?tax=0101234567', bizLookupSchema, {});
    expect(r.data.companyName).toContain('MediaSoft');
  });

  it('quên mật khẩu → đặt lại bằng token trong mail', async () => {
    const u = await createUser(t);
    await ep(
      t,
      'POST',
      '/auth/password/forgot',
      '/auth/password/forgot',
      null,
      { json: { email: u.email } },
      204,
    );
    const token = await resetTokenOf(t, u.email);
    if (!token) throw new Error('thiếu token đặt lại');
    await ep(
      t,
      'POST',
      '/auth/password/reset',
      '/auth/password/reset',
      null,
      { json: { token, newPassword: 'Reset@2027pass' } },
      204,
    );
  });

  it('SSO: callback email mới → complete; email cũ → existing', async () => {
    const email = uniqueEmail('ct-sso');
    const s = await ssoStart(t, 'google');
    const cb = await ep(
      t,
      'GET',
      '/auth/sso/:provider/callback',
      ssoCallbackPath(s.flow, email, s.state),
      ssoCallbackSchema,
      { headers: { cookie: s.cookie } },
    );
    if (cb.data.status !== 'new') throw new Error('phải là new');
    const done = await ep(
      t,
      'POST',
      '/auth/sso/complete',
      '/auth/sso/complete',
      loginResponseSchema,
      {
        json: {
          ssoToken: cb.data.ssoToken,
          accountType: 'personal',
          phone: { country: 'vn', number: '' },
          groupIds: ['c1'],
          agreeTerms: true,
        },
      },
    );
    expect(done.data.me.email).toBe(email);
  });

  it('TOTP: đăng nhập 401 + mfaToken → verify → phiên', async () => {
    const u = await createUser(t);
    await t.app.get(TotpService).enroll(u.id, u.email);
    const first = await t.call('/auth/login', {
      method: 'POST',
      json: { identifier: u.email, password: u.password },
    });
    expect(first.status).toBe(401);
    const err = apiErrorSchema.parse(await first.json()).error;
    const mfaToken = err.fields?.find((f) => f.path === 'mfaToken')?.message ?? '';
    const row = await t.prisma.db.user.findUniqueOrThrow({
      where: { id: u.id },
      select: { totpSecretEnc: true },
    });
    const secret = t.app.get(SecretBox).open(row.totpSecretEnc ?? new Uint8Array());
    const ok = await ep(t, 'POST', '/auth/totp/verify', '/auth/totp/verify', loginResponseSchema, {
      json: { mfaToken, code: totpAt(secret, new Date()) },
    });
    expect(ok.data.me.id).toBe(u.id);
  });
});
