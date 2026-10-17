import { apiErrorSchema, loginResponseSchema, meSchema } from '@opchub/shared/api';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

const ORIGIN = 'http://localhost:3000';

/** Lấy giá trị cookie refresh từ Set-Cookie */
function refreshCookie(res: Response): { value: string; raw: string } | null {
  const raw = res.headers.getSetCookie().find((c) => c.startsWith('opchub_rt='));
  if (!raw) return null;
  return { value: raw.split(';')[0]?.slice('opchub_rt='.length) ?? '', raw };
}

describe('auth core (TIP-B06)', () => {
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

  const login = (identifier: string, password: string, remember?: boolean) =>
    t.call('/auth/login', {
      method: 'POST',
      json: { identifier, password, ...(remember !== undefined ? { remember } : {}) },
    });

  const refresh = (cookie: string, origin = ORIGIN) =>
    t.call('/auth/refresh', {
      method: 'POST',
      headers: { Cookie: `opchub_rt=${cookie}`, Origin: origin },
    });

  it('đăng nhập bằng email: 200, body khớp hợp đồng, cookie httpOnly path /v1/auth', async () => {
    const u = await createUser(t, { fee: 'active' });
    const res = await login(u.email.toUpperCase(), u.password, true);
    expect(res.status).toBe(200);
    const body = loginResponseSchema.parse(await res.json());
    expect(body.me.id).toBe(u.id);
    expect(body.me.membershipFee?.status).toBe('active');
    const c = refreshCookie(res);
    expect(c?.raw).toMatch(/HttpOnly/i);
    expect(c?.raw).toMatch(/Path=\/v1\/auth/);
    expect(c?.raw).toMatch(/SameSite=Lax/i);
    expect(c?.raw).toMatch(/Expires=/); // D-34 ghi nhớ
  });

  it('không ghi nhớ → cookie phiên (không Expires)', async () => {
    const u = await createUser(t);
    const res = await login(u.email, u.password, false);
    expect(refreshCookie(res)?.raw).not.toMatch(/Expires=/);
  });

  it('đăng nhập bằng SĐT dạng 0xxx', async () => {
    const u = await createUser(t);
    const local = `0${u.phone.slice(3, 6)} ${u.phone.slice(6, 9)} ${u.phone.slice(9)}`;
    const res = await login(local, u.password);
    expect(res.status).toBe(200);
  });

  it('sai mật khẩu → 401 thông báo chung; email không tồn tại cũng vậy', async () => {
    const u = await createUser(t);
    const a = apiErrorSchema.parse(await (await login(u.email, 'wrong-pass')).json());
    const b = apiErrorSchema.parse(await (await login('ghost@x.vn', 'wrong-pass')).json());
    expect(a.error.code).toBe('UNAUTHORIZED');
    expect(a.error.message).toBe(b.error.message);
  });

  it('D-44: sai 5 lần → lần 6 (dù đúng mật khẩu) 429 + Retry-After', async () => {
    const u = await createUser(t);
    for (let i = 0; i < 5; i++) expect((await login(u.email, 'wrong-pass')).status).toBe(401);
    const res = await login(u.email, u.password);
    expect(res.status).toBe(429);
    expect(Number(res.headers.get('retry-after'))).toBeGreaterThan(800);
  });

  it('TK bị khoá → 403 (BR-02)', async () => {
    const u = await createUser(t, { status: 'locked' });
    const res = await login(u.email, u.password);
    expect(res.status).toBe(403);
    expect(apiErrorSchema.parse(await res.json()).error.message).toMatch(/khóa/);
  });

  it('refresh xoay vòng; dùng lại cookie cũ → 401 và thu hồi cả chuỗi', async () => {
    const u = await createUser(t);
    const first = refreshCookie(await login(u.email, u.password));
    if (!first) throw new Error('thiếu cookie');

    const r1 = await refresh(first.value);
    expect(r1.status).toBe(200);
    loginResponseSchema.parse(await r1.json());
    const second = refreshCookie(r1);
    expect(second?.value).toBeTruthy();
    expect(second?.value).not.toBe(first.value);

    expect((await refresh(first.value)).status).toBe(401); // dùng lại token cũ
    expect((await refresh(second?.value ?? '')).status).toBe(401); // chuỗi đã bị thu hồi
  });

  it('refresh từ Origin lạ → 403', async () => {
    const u = await createUser(t);
    const c = refreshCookie(await login(u.email, u.password));
    expect((await refresh(c?.value ?? '', 'https://evil.example')).status).toBe(403);
  });

  it('logout thu hồi phiên: refresh sau đó 401', async () => {
    const u = await createUser(t);
    const c = refreshCookie(await login(u.email, u.password));
    const out = await t.call('/auth/logout', {
      method: 'POST',
      headers: { Cookie: `opchub_rt=${c?.value ?? ''}`, Origin: ORIGIN },
    });
    expect(out.status).toBe(204);
    expect((await refresh(c?.value ?? '')).status).toBe(401);
  });

  it('GET /me với access token khớp meSchema; không token → 401', async () => {
    const u = await createUser(t, { accountType: 'investor' });
    const body = loginResponseSchema.parse(await (await login(u.email, u.password)).json());
    const res = await t.call('/me', { token: body.accessToken });
    expect(res.status).toBe(200);
    const me = meSchema.parse(await res.json());
    expect(me.membershipFee).toBeNull(); // D-14
    expect((await t.call('/me')).status).toBe(401);
  });
});
