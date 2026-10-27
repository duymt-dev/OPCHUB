import type { SsoProvider } from '@opchub/integrations';
import {
  apiErrorSchema,
  loginResponseSchema,
  publicSettingsSchema,
  ssoCallbackSchema,
} from '@opchub/shared/api';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ENV, type Env } from '@/common/config';
import { SSO } from '@/common/integrations';
import { ssoCallbackPath, ssoLogin, ssoStart } from '../factories/sso.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

let n = 0;
const uniqueEmail = () => `sso-${Date.now().toString(36)}-${(n += 1)}@test.opchub.vn`;

const completeBody = (ssoToken: string) => ({
  ssoToken,
  accountType: 'personal',
  phone: { country: 'vn', number: '' },
  groupIds: ['c1'],
  agreeTerms: true,
});

/** Bật/tắt một nút SSO trong `app_settings.security` + xoá cache (D-33) */
async function setProvider(t: TestApp, id: string, enabled: boolean): Promise<void> {
  await t.prisma.db.$executeRaw`
    UPDATE app_settings SET value = jsonb_set(value, '{providers}', (
      SELECT jsonb_agg(CASE WHEN p->>'id' = ${id}
        THEN jsonb_set(p, '{enabled}', to_jsonb(${enabled}::boolean)) ELSE p END)
      FROM jsonb_array_elements(value->'providers') p))
    WHERE key = 'security'`;
  await t.redis.client.del('settings:security');
}

/** FakeSsoProvider: `code` dạng email → danh tính có email đó */
describe('SSO (TIP-B11, D-45, TIP-V2-116 D-64)', () => {
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

  it('email mới → status=new; complete → 200, email_verified_at, identity, không mật khẩu', async () => {
    const email = uniqueEmail();
    const r = await ssoLogin(t, 'google', email);
    expect(r.status).toBe(200);
    const cb = ssoCallbackSchema.parse(await r.json());
    if (cb.status !== 'new') throw new Error('phải là new');
    expect(cb.email).toBe(email);

    const done = await t.call('/auth/sso/complete', {
      method: 'POST',
      json: completeBody(cb.ssoToken),
    });
    expect(done.status).toBe(200);
    const body = loginResponseSchema.parse(await done.json());
    // D-94 1A: TK mới (kể cả SSO) miễn phí 3 tháng
    expect(body.me.membershipFee?.status).toBe('trial');
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
      json: completeBody(cb.ssoToken),
    });
    expect(again.status).toBe(401);

    // Lần sau cùng provider → existing
    const next = ssoCallbackSchema.parse(await (await ssoLogin(t, 'google', email)).json());
    expect(next.status).toBe('existing');
  });

  it('REQ-002 D-64 nút gemini → liên kết google; bấm deepseek lần sau → cùng TK, vẫn 1 liên kết', async () => {
    const email = uniqueEmail();
    const cb = ssoCallbackSchema.parse(await (await ssoLogin(t, 'gemini', email)).json());
    if (cb.status !== 'new') throw new Error('phải là new');
    const done = await t.call('/auth/sso/complete', {
      method: 'POST',
      json: completeBody(cb.ssoToken),
    });
    const me = loginResponseSchema.parse(await done.json()).me;

    const next = ssoCallbackSchema.parse(await (await ssoLogin(t, 'deepseek', email)).json());
    expect(next.status).toBe('existing');
    if (next.status === 'existing') expect(next.me.id).toBe(me.id);
    const ids = await t.prisma.db.authIdentity.findMany({
      where: { userId: me.id },
      select: { provider: true },
    });
    expect(ids).toEqual([{ provider: 'google' }]);
  });

  it('D-64 email đã có TK chưa liên kết → existing + cookie refresh + tạo đúng 1 liên kết', async () => {
    const u = await createUser(t, { fee: 'active' });
    const r = await ssoLogin(t, 'chatgpt', u.email);
    expect(r.status).toBe(200);
    const cb = ssoCallbackSchema.parse(await r.json());
    expect(cb.status).toBe('existing');
    if (cb.status === 'existing') expect(cb.me.id).toBe(u.id);
    expect(r.headers.getSetCookie().some((c) => c.startsWith('opchub_rt='))).toBe(true);
    await ssoLogin(t, 'google', u.email);
    expect(await t.prisma.db.authIdentity.count({ where: { userId: u.id } })).toBe(1);
  });

  it('TK bị khoá → 403; nút lạ → 404', async () => {
    const u = await createUser(t, { status: 'locked' });
    expect((await ssoLogin(t, 'google', u.email)).status).toBe(403);
    expect((await t.call('/auth/sso/myspace', { redirect: 'manual' })).status).toBe(404);
  });

  it('REQ-217 D-64 bắt đầu: 1 redirect URI /sso/callback/google cho nút chatgpt + cookie state httpOnly', async () => {
    const env = t.app.get<Env>(ENV);
    const s = await ssoStart(t, 'chatgpt');
    expect(s.res.status).toBe(302);
    const loc = new URL(s.res.headers.get('location') ?? '');
    expect(`${loc.origin}${loc.pathname}`).toBe(`${env.PORTAL_URL}/sso/callback/google`);
    // Provider thật không gắn `?provider=` — Portal đọc luồng từ path
    expect(loc.searchParams.has('provider')).toBe(false);
    expect(s.state.length).toBeGreaterThanOrEqual(40);
    const raw = s.res.headers.getSetCookie().find((c) => c.startsWith('opchub_sso=')) ?? '';
    expect(raw).toMatch(/HttpOnly/i);
    expect(raw).toMatch(/Path=\/v1\/auth\/sso/);
    expect(raw).toMatch(/SameSite=Lax/i);
  });

  it('REQ-217 exchange nhận cùng redirect_uri + verifier/nonce của state', async () => {
    const env = t.app.get<Env>(ENV);
    const seen: { authorize?: string; exchange?: string; verifier?: string } = {};
    const sso = t.app.get<SsoProvider>(SSO);
    const origAuth = sso.authorizeUrl.bind(sso);
    const origEx = sso.exchange.bind(sso);
    sso.authorizeUrl = (f, req) => {
      seen.authorize = req.redirectUri;
      return origAuth(f, req);
    };
    sso.exchange = (f, req) => {
      seen.exchange = req.redirectUri;
      seen.verifier = req.codeVerifier;
      return origEx(f, req);
    };
    try {
      expect((await ssoLogin(t, 'facebook', uniqueEmail())).status).toBe(200);
    } finally {
      sso.authorizeUrl = origAuth;
      sso.exchange = origEx;
    }
    expect(seen.authorize).toBe(`${env.PORTAL_URL}/sso/callback/facebook`);
    expect(seen.exchange).toBe(seen.authorize);
    expect(seen.verifier?.length).toBeGreaterThanOrEqual(43);
  });

  describe('D-64 state chống CSRF / replay — không gọi exchange', () => {
    let exchanged = 0;
    let restore: () => void = () => undefined;
    beforeEach(() => {
      exchanged = 0;
      const sso = t.app.get<SsoProvider>(SSO);
      const orig = sso.exchange.bind(sso);
      sso.exchange = (f, req) => {
        exchanged += 1;
        return orig(f, req);
      };
      restore = () => {
        sso.exchange = orig;
      };
    });
    afterEach(() => restore());

    const expect401 = async (r: Response) => {
      expect(r.status).toBe(401);
      expect(apiErrorSchema.parse(await r.json()).error.message).toBe(
        'Phiên đăng nhập liên kết không hợp lệ, vui lòng thử lại',
      );
    };

    it('thiếu cookie', async () => {
      const s = await ssoStart(t, 'google');
      await expect401(await t.call(ssoCallbackPath(s.flow, uniqueEmail(), s.state)));
      expect(exchanged).toBe(0);
    });

    it('cookie của trình duyệt khác (state khác)', async () => {
      const a = await ssoStart(t, 'google');
      const b = await ssoStart(t, 'google');
      const r = await t.call(ssoCallbackPath(a.flow, uniqueEmail(), a.state), {
        headers: { cookie: b.cookie },
      });
      await expect401(r);
      expect(exchanged).toBe(0);
    });

    it('state không do server cấp', async () => {
      const r = await t.call(ssoCallbackPath('google', uniqueEmail(), 'forged'), {
        headers: { cookie: 'opchub_sso=forged' },
      });
      await expect401(r);
      expect(exchanged).toBe(0);
    });

    it('replay: state đã dùng → 401; callback xoá cookie state', async () => {
      const s = await ssoStart(t, 'google');
      const path = ssoCallbackPath(s.flow, uniqueEmail(), s.state);
      const first = await t.call(path, { headers: { cookie: s.cookie } });
      expect(first.status).toBe(200);
      expect(first.headers.getSetCookie().some((c) => /^opchub_sso=;/.test(c))).toBe(true);
      await expect401(await t.call(path, { headers: { cookie: s.cookie } }));
      expect(exchanged).toBe(1);
    });

    it('state hết hạn (đã xoá khỏi Redis)', async () => {
      const s = await ssoStart(t, 'google');
      await t.redis.client.del(`sso:state:${s.state}`);
      await expect401(
        await t.call(ssoCallbackPath(s.flow, uniqueEmail(), s.state), {
          headers: { cookie: s.cookie },
        }),
      );
      expect(exchanged).toBe(0);
    });

    it('state của luồng khác (facebook dùng ở callback google)', async () => {
      const s = await ssoStart(t, 'facebook');
      await expect401(
        await t.call(ssoCallbackPath('google', uniqueEmail(), s.state), {
          headers: { cookie: s.cookie },
        }),
      );
      expect(exchanged).toBe(0);
    });
  });

  it('D-33 D-64 nút bị Admin tắt: không bắt đầu được, không hiện ở /public/settings; tắt giữa chừng → 403', async () => {
    try {
      const s = await ssoStart(t, 'gemini');
      await setProvider(t, 'gemini', false);
      expect((await t.call('/auth/sso/gemini', { redirect: 'manual' })).status).toBe(403);
      const pub = publicSettingsSchema.parse(await (await t.call('/public/settings')).json());
      expect(pub.ssoProviders).not.toContain('gemini');
      expect(pub.ssoProviders).toContain('google');
      const r = await t.call(ssoCallbackPath(s.flow, uniqueEmail(), s.state), {
        headers: { cookie: s.cookie },
      });
      expect(r.status).toBe(403);
    } finally {
      await setProvider(t, 'gemini', true);
    }
  });

  it('REQ-217 NA-17 D-62 TK quản trị SSO → 409', async () => {
    const u = await createUser(t, { systemRole: 'admin', fee: 'active' });
    const r = await ssoLogin(t, 'google', u.email);
    expect(r.status).toBe(409);
    expect(apiErrorSchema.parse(await r.json()).error.message).toBe(
      'Tài khoản quản trị không đăng nhập bằng SSO',
    );
    expect(r.headers.getSetCookie().some((c) => c.startsWith('opchub_rt='))).toBe(false);
  });
});

/** D-64: provider chỉ hỗ trợ Google (như GoogleSsoProvider) → Facebook/LinkedIn bị ẩn và 404 */
describe('SSO khi provider chỉ hỗ trợ Google (D-64)', () => {
  let t: TestApp;
  const googleOnly: SsoProvider = {
    name: 'google-only',
    supports: (b) => ['google', 'chatgpt', 'gemini', 'deepseek'].includes(b),
    flowOf: () => 'google',
    authorizeUrl: (_f, req) => `${req.redirectUri}?code=x&state=${req.state}`,
    exchange: () => Promise.resolve(null),
  };

  beforeAll(async () => {
    t = await createTestApp({ overrides: [[SSO, googleOnly]] });
  });
  afterAll(async () => {
    await t.close();
  });

  it('D-89 /public/settings chỉ Google (bỏ nút ChatGPT / Gemini / DeepSeek); GET /auth/sso/facebook → 404', async () => {
    const pub = publicSettingsSchema.parse(await (await t.call('/public/settings')).json());
    expect(pub.ssoProviders).toEqual(['google']);
    expect((await t.call('/auth/sso/facebook', { redirect: 'manual' })).status).toBe(404);
    expect((await t.call('/auth/sso/linkedin', { redirect: 'manual' })).status).toBe(404);
  });

  it('exchange trả null (Google từ chối code) → 401', async () => {
    const r = await ssoLogin(t, 'google', 'bad-code');
    expect(r.status).toBe(401);
  });
});
