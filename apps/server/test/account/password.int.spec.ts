import { apiErrorSchema, loginResponseSchema } from '@opchub/shared/api';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { SecretBox } from '@/common/crypto/secret-box';
import { TotpService } from '@/modules/account';
import { totpAt } from '@/modules/account/domain/totp';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

const ORIGIN = 'http://localhost:3000';
const NEW_PASSWORD = 'NewPass@2027';

function refreshCookie(res: Response): string | undefined {
  const raw = res.headers.getSetCookie().find((c) => c.startsWith('opchub_rt='));
  return raw?.split(';')[0]?.slice('opchub_rt='.length);
}

describe('mật khẩu, phiên, TOTP (TIP-B12)', () => {
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

  const post = (
    path: string,
    json?: unknown,
    init: { token?: string; cookie?: string | undefined } = {},
  ) =>
    t.call(path, {
      method: 'POST',
      ...(json !== undefined ? { json } : {}),
      ...(init.token ? { token: init.token } : {}),
      headers: { Origin: ORIGIN, ...(init.cookie ? { Cookie: `opchub_rt=${init.cookie}` } : {}) },
    });
  const login = async (identifier: string, password: string) => {
    const res = await post('/auth/login', { identifier, password });
    return { res, cookie: refreshCookie(res) };
  };
  /** Token đặt lại nằm trong link của mail password_reset mới nhất */
  const resetToken = async (email: string) => {
    const row = await t.prisma.db.mailLog.findFirst({
      where: { to: email, kind: 'password_reset' },
      orderBy: { createdAt: 'desc' },
      select: { bodyHtml: true },
    });
    return /token=([\w-]+)/.exec(row?.bodyHtml ?? '')?.[1];
  };

  it('forgot: email không tồn tại → 204, không có mail; tồn tại → 204 + mail có link (không mật khẩu)', async () => {
    const ghost = `ghost-${Date.now()}@test.opchub.vn`;
    expect((await post('/auth/password/forgot', { email: ghost })).status).toBe(204);
    expect(await t.prisma.db.mailLog.count({ where: { to: ghost } })).toBe(0);

    const u = await createUser(t);
    expect((await post('/auth/password/forgot', { email: u.email })).status).toBe(204);
    const token = await resetToken(u.email);
    expect(token).toBeTruthy();
  });

  it('reset: token đúng → 204, mật khẩu mới đăng nhập được, access cũ 401, token dùng lần 2 → 400', async () => {
    const u = await createUser(t, { fee: 'active' });
    const before = loginResponseSchema.parse(await (await login(u.email, u.password)).res.json());
    await post('/auth/password/forgot', { email: u.email });
    const token = await resetToken(u.email);
    if (!token) throw new Error('thiếu token');

    expect((await post('/auth/password/reset', { token, newPassword: NEW_PASSWORD })).status).toBe(
      204,
    );
    expect((await t.call('/me', { token: before.accessToken })).status).toBe(401);
    expect((await login(u.email, u.password)).res.status).toBe(401);
    expect((await login(u.email, NEW_PASSWORD)).res.status).toBe(200);
    const again = await post('/auth/password/reset', { token, newPassword: NEW_PASSWORD });
    expect(again.status).toBe(400);
    const outbox = await t.prisma.db.outboxEvent.count({
      where: { type: 'user.session_revoked', payload: { path: ['userId'], equals: u.id } },
    });
    expect(outbox).toBe(1);
  });

  it('reset: mật khẩu yếu → 400 trường newPassword', async () => {
    const u = await createUser(t);
    await post('/auth/password/forgot', { email: u.email });
    const token = await resetToken(u.email);
    const r = await post('/auth/password/reset', { token, newPassword: 'abc' });
    expect(r.status).toBe(400);
    expect(apiErrorSchema.parse(await r.json()).error.fields?.[0]?.path).toBe('newPassword');
  });

  it('forgot quá 3 lần/giờ → vẫn 204 nhưng không gửi thêm', async () => {
    const u = await createUser(t);
    for (let i = 0; i < 5; i += 1) await post('/auth/password/forgot', { email: u.email });
    expect(
      await t.prisma.db.mailLog.count({ where: { to: u.email, kind: 'password_reset' } }),
    ).toBe(3);
  });

  it('change: sai mật khẩu hiện tại → 400 currentWrong; đúng → 204, thiết bị hiện tại vẫn refresh, thiết bị khác bị thu hồi', async () => {
    const u = await createUser(t, { fee: 'active' });
    const a = await login(u.email, u.password);
    const b = await login(u.email, u.password);
    const { accessToken } = loginResponseSchema.parse(await a.res.json());

    const wrong = await post(
      '/auth/password/change',
      { currentPassword: 'Sai@12345', newPassword: NEW_PASSWORD },
      { token: accessToken, cookie: a.cookie },
    );
    expect(wrong.status).toBe(400);
    expect(apiErrorSchema.parse(await wrong.json()).error.message).toBe(
      'Mật khẩu hiện tại không đúng',
    );

    const ok = await post(
      '/auth/password/change',
      { currentPassword: u.password, newPassword: NEW_PASSWORD },
      { token: accessToken, cookie: a.cookie },
    );
    expect(ok.status).toBe(204);
    expect((await post('/auth/refresh', undefined, { cookie: a.cookie })).status).toBe(200);
    expect((await post('/auth/refresh', undefined, { cookie: b.cookie })).status).toBe(401);
  });

  it('revoke-others: thu hồi chuỗi khác, giữ chuỗi hiện tại', async () => {
    const u = await createUser(t, { fee: 'active' });
    const a = await login(u.email, u.password);
    const b = await login(u.email, u.password);
    const c = await login(u.email, u.password);
    const { accessToken } = loginResponseSchema.parse(await a.res.json());
    const r = await post('/auth/sessions/revoke-others', undefined, {
      token: accessToken,
      cookie: a.cookie,
    });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ revoked: 2 });
    expect((await post('/auth/refresh', undefined, { cookie: a.cookie })).status).toBe(200);
    expect((await post('/auth/refresh', undefined, { cookie: b.cookie })).status).toBe(401);
    expect((await post('/auth/refresh', undefined, { cookie: c.cookie })).status).toBe(401);
  });

  it('TOTP: TK đã bật → login 401 + mfaToken; mã sai 401; mã đúng → phiên; mã không dùng lại', async () => {
    const u = await createUser(t, { systemRole: 'admin' });
    const totp = t.app.get(TotpService);
    const { otpauthUrl } = await totp.enroll(u.id, u.email);
    const secret = /secret=([A-Z2-7]+)/.exec(otpauthUrl)?.[1];
    expect(secret).toBeTruthy();
    const row = await t.prisma.db.user.findUniqueOrThrow({
      where: { id: u.id },
      select: { totpSecretEnc: true },
    });
    // Secret lưu mã hoá, không phải base32 thô
    expect(Buffer.from(row.totpSecretEnc ?? []).toString('utf8')).not.toContain(secret);

    const first = await login(u.email, u.password);
    expect(first.res.status).toBe(401);
    expect(first.cookie).toBeUndefined();
    const err = apiErrorSchema.parse(await first.res.json()).error;
    expect(err.message).toBe('Cần mã xác thực 2 lớp');
    const mfaToken = err.fields?.find((f) => f.path === 'mfaToken')?.message ?? '';

    expect((await post('/auth/totp/verify', { mfaToken, code: '000000' })).status).toBe(401);
    const raw = t.app.get(SecretBox).open(row.totpSecretEnc ?? new Uint8Array());
    const code = totpAt(raw, new Date());
    const ok = await post('/auth/totp/verify', { mfaToken, code });
    expect(ok.status).toBe(200);
    expect(loginResponseSchema.parse(await ok.json()).me.id).toBe(u.id);
    expect(refreshCookie(ok)).toBeTruthy();
    // mfaToken dùng một lần
    expect((await post('/auth/totp/verify', { mfaToken, code })).status).toBe(401);
  });
});
