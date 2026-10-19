import type { SsoProvider } from '@opchub/integrations';
import { apiErrorSchema, loginResponseSchema, ssoCallbackSchema } from '@opchub/shared/api';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ENV, type Env } from '@/common/config';
import { SSO } from '@/common/integrations';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

let n = 0;
const uniqueEmail = () => `sso-${Date.now().toString(36)}-${(n += 1)}@test.opchub.vn`;

/** FakeSsoProvider: `code` dạng email → danh tính có email đó */
describe('SSO (TIP-B11, D-45)', () => {
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

  const callback = (provider: string, code: string) =>
    t.call(`/auth/sso/${provider}/callback?code=${encodeURIComponent(code)}`);

  it('email mới → status=new; complete → 200, email_verified_at, identity, không mật khẩu', async () => {
    const email = uniqueEmail();
    const r = await callback('google', email);
    expect(r.status).toBe(200);
    const cb = ssoCallbackSchema.parse(await r.json());
    if (cb.status !== 'new') throw new Error('phải là new');
    expect(cb.email).toBe(email);

    const done = await t.call('/auth/sso/complete', {
      method: 'POST',
      json: {
        ssoToken: cb.ssoToken,
        accountType: 'personal',
        phone: { country: 'vn', number: '' },
        groupIds: ['c1'],
      },
    });
    expect(done.status).toBe(200);
    const body = loginResponseSchema.parse(await done.json());
    expect(body.me.membershipFee?.status).toBe('pending_payment');
    const u = await t.prisma.db.user.findUniqueOrThrow({
      where: { email },
      select: {
        emailVerifiedAt: true,
        passwordHash: true,
        identities: { select: { provider: true } },
      },
    });
    expect(u.emailVerifiedAt).not.toBeNull();
    expect(u.passwordHash).toBeNull();
    expect(u.identities).toEqual([{ provider: 'google' }]);

    // Token dùng một lần
    const again = await t.call('/auth/sso/complete', {
      method: 'POST',
      json: {
        ssoToken: cb.ssoToken,
        accountType: 'personal',
        phone: { country: 'vn', number: '' },
        groupIds: ['c1'],
      },
    });
    expect(again.status).toBe(401);

    // Lần sau cùng provider → existing
    const next = ssoCallbackSchema.parse(await (await callback('google', email)).json());
    expect(next.status).toBe('existing');
  });

  it('email đã có TK → existing + cookie refresh', async () => {
    const u = await createUser(t, { fee: 'active' });
    const r = await callback('facebook', u.email);
    expect(r.status).toBe(200);
    const cb = ssoCallbackSchema.parse(await r.json());
    expect(cb.status).toBe('existing');
    if (cb.status === 'existing') expect(cb.me.id).toBe(u.id);
    expect(r.headers.getSetCookie().some((c) => c.startsWith('opchub_rt='))).toBe(true);
  });

  it('TK bị khoá → 403; provider lạ → 404', async () => {
    const u = await createUser(t, { status: 'locked' });
    expect((await callback('google', u.email)).status).toBe(403);
    expect((await callback('myspace', 'x')).status).toBe(404);
  });

  it('BUG-034 REQ-217 authorizeUrl dùng redirect_uri /sso/callback/<provider>', async () => {
    const env = t.app.get<Env>(ENV);
    const r = await t.call('/auth/sso/google', { redirect: 'manual' });
    expect(r.status).toBe(302);
    const loc = new URL(r.headers.get('location') ?? '');
    expect(`${loc.origin}${loc.pathname}`).toBe(`${env.PORTAL_URL}/sso/callback/google`);
    // Provider thật không gắn `?provider=` — Portal phải đọc provider từ path
    expect(loc.searchParams.has('provider')).toBe(false);
    expect(loc.searchParams.get('code')).toBe('mock');
  });

  it('REQ-217 exchange nhận cùng redirect_uri', async () => {
    const env = t.app.get<Env>(ENV);
    const seen: { authorize?: string; exchange?: string } = {};
    const sso = t.app.get<SsoProvider>(SSO);
    const origAuth = sso.authorizeUrl.bind(sso);
    const origEx = sso.exchange.bind(sso);
    sso.authorizeUrl = (p, uri, state) => {
      seen.authorize = uri;
      return origAuth(p, uri, state);
    };
    sso.exchange = (p, code, uri) => {
      seen.exchange = uri;
      return origEx(p, code, uri);
    };
    try {
      await t.call('/auth/sso/facebook', { redirect: 'manual' });
      await callback('facebook', uniqueEmail());
    } finally {
      sso.authorizeUrl = origAuth;
      sso.exchange = origEx;
    }
    expect(seen.authorize).toBe(`${env.PORTAL_URL}/sso/callback/facebook`);
    expect(seen.exchange).toBe(seen.authorize);
  });

  it('REQ-217 NA-17 D-62 TK quản trị SSO → 409', async () => {
    const u = await createUser(t, { systemRole: 'admin', fee: 'active' });
    const r = await callback('google', u.email);
    expect(r.status).toBe(409);
    expect(apiErrorSchema.parse(await r.json()).error.message).toBe(
      'Tài khoản quản trị không đăng nhập bằng SSO',
    );
    expect(r.headers.getSetCookie().some((c) => c.startsWith('opchub_rt='))).toBe(false);
  });
});
