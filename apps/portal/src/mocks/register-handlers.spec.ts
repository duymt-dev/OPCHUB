import { setupServer } from 'msw/node';
import { handlers } from './handlers';

const server = setupServer(...handlers);
const BASE = `${location.origin}/v1`;

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterAll(() => server.close());

const post = (path: string, body: unknown) =>
  fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const personal = {
  fullName: 'Test',
  phone: { country: 'vn', number: '912345678' },
  email: 'test@x.vn',
  password: 'User@2026',
  persona: 'expert',
  groupIds: ['c1'],
  agreeTerms: true,
};

describe('MSW đăng ký / OTP', () => {
  it('đăng ký cá nhân → 202, OTP đúng thì trả phiên', async () => {
    expect((await post('/auth/register/personal', personal)).status).toBe(202);
    const wrong = await post('/auth/otp/verify', { email: 'test@x.vn', code: '000000' });
    expect(wrong.status).toBe(400);
    const ok = await post('/auth/otp/verify', { email: 'test@x.vn', code: '123456' });
    const body = (await ok.json()) as { me: { fullName: string } };
    expect(body.me.fullName).toBe('Test');
  });

  it('thiếu nhóm → báo lỗi tiếng Việt', async () => {
    const res = await post('/auth/register/personal', { ...personal, groupIds: [] });
    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message).toBe('Vui lòng chọn ít nhất 1 nhóm');
  });

  it('BUG-009 UAT-02 email đã có TK → 409 fields email (như server)', async () => {
    const res = await post('/auth/register/personal', {
      ...personal,
      email: 'an.nguyen@mediasoft.vn',
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as {
      error: { code: string; fields: { path: string; message: string }[] };
    };
    expect(body.error.code).toBe('CONFLICT');
    expect(body.error.fields).toEqual([
      { path: 'email', message: 'Email đã được sử dụng cho tài khoản khác' },
    ]);
  });

  it('BUG-022 400 kèm fields theo path', async () => {
    const res = await post('/auth/register/personal', { ...personal, groupIds: [] });
    const body = (await res.json()) as { error: { fields: { path: string }[] } };
    expect(body.error.fields.map((f) => f.path)).toEqual(['groupIds']);
  });

  it('tra MST hợp lệ thấy DN, sai định dạng → 400', async () => {
    const ok = (await (await fetch(`${BASE}/biz/lookup?tax=0101234567`)).json()) as {
      otherIndustries: string[];
    };
    expect(ok.otherIndustries).toHaveLength(4);
    expect((await fetch(`${BASE}/biz/lookup?tax=123`)).status).toBe(400);
  });

  it('quên mật khẩu luôn 204; TK chưa đóng phí đăng nhập được (D-28)', async () => {
    expect((await post('/auth/password/forgot', { email: 'ai@x.vn' })).status).toBe(204);
    const res = await post('/auth/login', {
      identifier: 'do.haiyen@opchub.vn',
      password: 'User@2026',
    });
    const body = (await res.json()) as { me: { membershipFee: { status: string } } };
    expect(body.me.membershipFee.status).toBe('pending_payment');
  });

  it('SSO email mới → form bổ sung, hoàn tất trả phiên (D-45)', async () => {
    const cb = (await (await fetch(`${BASE}/auth/sso/google/callback?code=x`)).json()) as {
      status: string;
      ssoToken: string;
    };
    expect(cb.status).toBe('new');
    const done = await post('/auth/sso/complete', {
      ssoToken: cb.ssoToken,
      accountType: 'personal',
      phone: { country: 'vn', number: '' },
      groupIds: ['c1'],
      agreeTerms: true,
    });
    expect(done.status).toBe(200);
  });
});
