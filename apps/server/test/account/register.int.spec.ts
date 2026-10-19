import { apiErrorSchema, loginResponseSchema, otpSentSchema } from '@opchub/shared/api';
import { randomInt } from 'node:crypto';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createUser, flushAuthState } from '../factories/user.factory';
import { TERMS_VERSION } from '@/modules/account/repositories/registration.repository';
import { createTestApp, type TestApp } from '../setup/test-app';

const OTP = '123456';
let n = 0;
const uniqueEmail = () => `reg-${Date.now().toString(36)}-${(n += 1)}@test.opchub.vn`;
const uniquePhone = () => `09${String(randomInt(1e8)).padStart(8, '0')}`;

const personal = (email: string, extra: Record<string, unknown> = {}) => ({
  fullName: 'Người Đăng Ký',
  phone: { country: 'vn', number: '' },
  email,
  password: '',
  persona: 'expert',
  groupIds: ['c1', 'c2'],
  agreeTerms: true,
  ...extra,
});

const business = (email: string, taxCode: string, companyName: string) => ({
  taxCode,
  companyName,
  mainIndustry: '6201 – Lập trình máy vi tính',
  otherIndustries: [],
  size: '1',
  country: 'vn',
  representative: 'Nguyễn Văn An',
  position: 'Giám đốc',
  phone: { country: 'vn', number: '' },
  email,
  password: 'Opchub@2026',
  groupIds: ['c1'],
  agreeTerms: true,
});

describe('đăng ký + OTP (TIP-B11)', () => {
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
  afterEach(async () => {
    await t.prisma.db.appSetting.update({
      where: { key: 'general' },
      data: { value: { ...(await general()), openRegistration: true } },
    });
  });

  const general = async () => {
    const row = await t.prisma.db.appSetting.findUniqueOrThrow({ where: { key: 'general' } });
    return row.value as Record<string, unknown>;
  };
  const post = (path: string, json: unknown) => t.call(path, { method: 'POST', json });
  const verify = (email: string, code: string) => post('/auth/otp/verify', { email, code });

  it('REQ-382 thiếu agreeTerms (cá nhân, DN) → 400, không gửi OTP', async () => {
    const email = uniqueEmail();
    const noAgree: Record<string, unknown> = { ...personal(email) };
    delete noAgree.agreeTerms;
    expect((await post('/auth/register/personal', noAgree)).status).toBe(400);
    expect((await post('/auth/register/personal', { ...noAgree, agreeTerms: false })).status).toBe(
      400,
    );
    const bizNoAgree: Record<string, unknown> = { ...business(email, '0109999001', 'Công ty Thử') };
    delete bizNoAgree.agreeTerms;
    expect((await post('/auth/register/business', bizNoAgree)).status).toBe(400);
    expect(await t.prisma.db.mailLog.count({ where: { to: email } })).toBe(0);
  });

  it('REQ-013 REQ-382 cá nhân: 202 → OTP ghi mail_logs + outbox; verify → phiên, phí pending, nhóm pending, mail chào mừng', async () => {
    const email = uniqueEmail();
    const res = await post('/auth/register/personal', personal(email));
    expect(res.status).toBe(202);
    expect(otpSentSchema.parse(await res.json())).toEqual({ email, expiresInSec: 600 });
    // Chưa tạo user trước OTP
    expect(await t.prisma.db.user.count({ where: { email } })).toBe(0);
    const otpMail = await t.prisma.db.mailLog.findFirst({ where: { to: email, kind: 'otp' } });
    expect(otpMail?.bodyHtml).toContain(OTP);

    const ok = await verify(email, OTP);
    expect(ok.status).toBe(200);
    const body = loginResponseSchema.parse(await ok.json());
    expect(body.me.email).toBe(email);
    expect(body.me.membershipFee?.status).toBe('pending_payment');
    expect(body.me.membershipFee?.transferRef).toMatch(/^OPCHUB TV\d{6}$/);
    expect(ok.headers.getSetCookie().some((c) => c.startsWith('opchub_rt='))).toBe(true);

    const user = await t.prisma.db.user.findUniqueOrThrow({
      where: { email },
      select: { id: true, emailVerifiedAt: true, passwordHash: true, registrationRole: true },
    });
    expect(user.emailVerifiedAt).not.toBeNull();
    expect(user.passwordHash).toBeNull();
    expect(user.registrationRole).toBe('expert');
    const groups = await t.prisma.db.groupMember.findMany({
      where: { userId: user.id },
      select: { groupId: true, status: true },
      orderBy: { groupId: 'asc' },
    });
    // REQ-218 NA-18: c1 cần duyệt → chờ + báo chủ nhóm; c2 mở → vào ngay
    expect(groups).toEqual([
      { groupId: 'c1', status: 'pending' },
      { groupId: 'c2', status: 'member' },
    ]);
    const asked = await t.prisma.db.outboxEvent.findMany({
      where: { type: 'group.join_requested', payload: { path: ['userId'], equals: user.id } },
      select: { payload: true },
    });
    expect(asked.map((o) => o.payload)).toEqual([{ groupId: 'c1', userId: user.id, intro: '' }]);
    // REQ-013 REQ-382: điều khoản + bảo mật + chính sách phí không hoàn lại, cùng phiên bản SRS-3.6
    const consents = await t.prisma.db.consent.findMany({
      where: { userId: user.id },
      select: { kind: true, version: true },
      orderBy: { kind: 'asc' },
    });
    expect(consents).toEqual([
      { kind: 'terms', version: TERMS_VERSION },
      { kind: 'privacy', version: TERMS_VERSION },
      { kind: 'fee_policy', version: TERMS_VERSION },
    ]);
    const welcome = await t.prisma.db.mailLog.findFirst({ where: { to: email, kind: 'welcome' } });
    expect(welcome?.bodyHtml).not.toMatch(/mật khẩu/i);

    // Popup mail chào mừng: lần đầu 200, lần sau 204
    const w1 = await t.call('/me/welcome-mail', { token: body.accessToken });
    expect(w1.status).toBe(200);
    expect(((await w1.json()) as { to: string }).to).toBe(email);
    const w2 = await t.call('/me/welcome-mail', { token: body.accessToken });
    expect(w2.status).toBe(204);
  });

  it('email hoặc SĐT đã có TK → 409', async () => {
    const u = await createUser(t);
    const r1 = await post('/auth/register/personal', personal(u.email.toUpperCase()));
    expect(r1.status).toBe(409);
    const local = `0${u.phone.slice(3)}`;
    const r2 = await post(
      '/auth/register/personal',
      personal(uniqueEmail(), { phone: { country: 'vn', number: local } }),
    );
    expect(r2.status).toBe(409);
    expect(apiErrorSchema.parse(await r2.json()).error.fields?.[0]?.path).toBe('phone');
  });

  it('mật khẩu yếu → 400; bỏ trống được (Q-B11-1)', async () => {
    const weak = await post(
      '/auth/register/personal',
      personal(uniqueEmail(), { password: 'abc' }),
    );
    expect(weak.status).toBe(400);
    const strong = await post(
      '/auth/register/personal',
      personal(uniqueEmail(), {
        password: 'Opchub@2026',
        phone: { country: 'vn', number: uniquePhone() },
      }),
    );
    expect(strong.status).toBe(202);
  });

  it('OTP sai → 422 OTP_INVALID; sai 5 lần → mã bị huỷ, mã đúng cũng 422 cho tới khi gửi lại', async () => {
    const email = uniqueEmail();
    await post('/auth/register/personal', personal(email));
    for (let i = 0; i < 5; i += 1) {
      const r = await verify(email, '000000');
      expect(r.status).toBe(422);
      expect(apiErrorSchema.parse(await r.json()).error.code).toBe('OTP_INVALID');
    }
    expect((await verify(email, OTP)).status).toBe(422);
    expect((await post('/auth/otp/resend', { email })).status).toBe(202);
    expect((await verify(email, OTP)).status).toBe(200);
  });

  it('gửi OTP quá 3 lần / 15 phút → 429', async () => {
    const email = uniqueEmail();
    await post('/auth/register/personal', personal(email));
    expect((await post('/auth/otp/resend', { email })).status).toBe(202);
    expect((await post('/auth/otp/resend', { email })).status).toBe(202);
    const r = await post('/auth/otp/resend', { email });
    expect(r.status).toBe(429);
    expect(r.headers.get('retry-after')).toBeTruthy();
  });

  it('DN: tên khớp MST → verified; MST không tra được → pending (D-40)', async () => {
    const e1 = uniqueEmail();
    await post(
      '/auth/register/business',
      business(e1, '0101234567', 'CÔNG TY TNHH GIẢI PHÁP MEDIASOFT'),
    );
    expect((await verify(e1, OTP)).status).toBe(200);
    const e2 = uniqueEmail();
    await post('/auth/register/business', business(e2, '0109999000', 'Công ty Không Tra Được'));
    const r2 = await verify(e2, OTP);
    expect(r2.status).toBe(200);
    expect(loginResponseSchema.parse(await r2.json()).me.accountType).toBe('business');

    const rows = await t.prisma.db.businessProfile.findMany({
      where: { user: { email: { in: [e1, e2] } } },
      select: { verification: true, user: { select: { email: true } } },
    });
    const by = Object.fromEntries(rows.map((r) => [r.user.email, r.verification]));
    expect(by[e1]).toBe('verified');
    expect(by[e2]).toBe('pending');
  });

  it('tra MST: hợp lệ → bizLookup; sai định dạng 400; không thấy 404', async () => {
    const ok = await t.call('/biz/lookup?tax=0101234567');
    expect(ok.status).toBe(200);
    expect(((await ok.json()) as { companyName: string }).companyName).toContain('MediaSoft');
    expect((await t.call('/biz/lookup?tax=123')).status).toBe(400);
    expect((await t.call('/biz/lookup?tax=0101234000')).status).toBe(404);
  });

  it('đăng ký đang đóng → 403; /public/settings trả false', async () => {
    await t.prisma.db.appSetting.update({
      where: { key: 'general' },
      data: { value: { ...(await general()), openRegistration: false } },
    });
    await flushAuthState(t);
    const s = await t.call('/public/settings');
    expect(await s.json()).toEqual({ registrationOpen: false });
    expect((await post('/auth/register/personal', personal(uniqueEmail()))).status).toBe(403);
  });

  it('/public/stats: số thành viên + nhóm', async () => {
    const r = await t.call('/public/stats');
    expect(r.status).toBe(200);
    const body = (await r.json()) as { members: number; communities: number };
    // = số nhóm chưa xoá (34 seed + nhóm test của factory, nếu còn)
    expect(body.communities).toBe(await t.prisma.db.group.count({ where: { deletedAt: null } }));
    expect(body.communities).toBeGreaterThanOrEqual(34);
    expect(body.members).toBeGreaterThanOrEqual(0);
  });
});
