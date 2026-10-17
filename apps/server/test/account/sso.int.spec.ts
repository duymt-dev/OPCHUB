import { loginResponseSchema, ssoCallbackSchema } from '@opchub/shared/api';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
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

  it('bắt đầu OAuth → 302 tới callback của Portal (fake)', async () => {
    const r = await t.call('/auth/sso/google', { redirect: 'manual' });
    expect(r.status).toBe(302);
    expect(r.headers.get('location')).toMatch(/\/sso\/callback\?provider=google&code=mock/);
  });
});
