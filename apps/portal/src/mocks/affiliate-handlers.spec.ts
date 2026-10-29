import { apiErrorSchema, loginResponseSchema } from '@opchub/shared/api';
import {
  affiliateBankSchema,
  affiliateCodeResultSchema,
  affiliateReferralsSchema,
  myAffiliateSchema,
} from '@opchub/shared/api-domains';
import {
  mockDb,
  clickMockAffiliate,
  myMockAffiliate,
  resetMockDb,
  feeAction,
} from '@opchub/shared/mock-domains';
import { setupServer } from 'msw/node';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { handlers } from './handlers';

const server = setupServer(...handlers);
const BASE = `${location.origin}/v1`;
const as = (id: string) => ({ Authorization: `Bearer mock.${id}` });
const post = (path: string, body: unknown) =>
  fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
const personal = (email: string, referralCode: string) => ({
  email,
  referralCode,
  fullName: 'Nguyễn Trà My',
  phone: { country: 'vn', number: '' },
  password: '',
  persona: 'expert',
  groupIds: ['c1'],
  agreeTerms: true,
});
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => resetMockDb());
afterAll(() => server.close());

describe('Affiliate MSW contracts (TIP-V2-403)', () => {
  it('D-94 3A member never paid is already an agent; paid member active; unauthenticated denied', async () => {
    const unpaid = myAffiliateSchema.parse(
      await (await fetch(`${BASE}/me/affiliate`, { headers: as('m6') })).json(),
    );
    expect(unpaid).toMatchObject({
      state: 'active',
      // BR-AFF-REV (TIP-V42-707): 20% × Cá nhân 1.200.000 / DN 3.600.000; Gói Gọi vốn 10% × 15.000.000
      policy: {
        rate: 20,
        perAmount: 240000,
        bizAmount: 720000,
        fundAmount: 1500000,
        fundRate: 10,
        cookieDays: 30,
      },
    });
    if (unpaid.state === 'locked') throw new Error('Unexpected locked');
    expect(unpaid.code).toMatch(/^OPC\d+$/);
    const active = myAffiliateSchema.parse(
      await (await fetch(`${BASE}/me/affiliate`, { headers: as('m1') })).json(),
    );
    expect(active).toMatchObject({ state: 'active', code: 'OPCAN26' });
    expect((await fetch(`${BASE}/me/affiliate`)).status).toBe(401);
  });
  it('REQ-304 not_found/self match the server messages; D-110 expired agent code stays valid', async () => {
    const owner = mockDb().fees.find((f) => f.userId === 'm1');
    if (!owner) throw new Error('Missing m1');
    for (const [code, email, reason] of [
      ['UNKNOWN999', 'new@test.vn', 'not_found'],
      ['OPCAN26', owner.email.toUpperCase(), 'self'],
    ] as const) {
      const result = affiliateCodeResultSchema.parse(
        await (
          await fetch(`${BASE}/public/affiliate/codes/${code}?email=${encodeURIComponent(email)}`)
        ).json(),
      );
      expect(result).toMatchObject({ valid: false, reason });
      const res = await post('/auth/register/personal', personal(email, code));
      expect(res.status).toBe(400);
      expect(apiErrorSchema.parse(await res.json()).error.fields?.[0]?.path).toBe('referralCode');
    }
    owner.status = 'expired';
    owner.validUntil = '2020-01-01T00:00:00Z';
    expect(
      affiliateCodeResultSchema.parse(
        await (await fetch(`${BASE}/public/affiliate/codes/OPCAN26`)).json(),
      ),
    ).toMatchObject({ valid: true });
    expect((await post('/auth/register/personal', personal('new@test.vn', 'OPCAN26'))).status).toBe(
      202,
    );
  });
  it('REQ-303 click is deduplicated hourly; D-110 expired agent still records clicks', async () => {
    for (let i = 0; i < 2; i++)
      expect((await post('/public/affiliate/click', { code: 'opcan26' })).status).toBe(204);
    const active = myMockAffiliate('m1', location.origin);
    if (active.state === 'locked') throw new Error('Unexpected locked');
    expect(active.stats.clicks30d).toBe(1);
    const owner = mockDb().fees.find((f) => f.userId === 'm1');
    if (!owner) throw new Error('Missing m1');
    owner.status = 'expired';
    clickMockAffiliate('OPCAN26', 'other-ip');
    expect(myMockAffiliate('m1', location.origin)).toMatchObject({
      state: 'active',
      stats: { clicks30d: 2 },
    });
  });
  it('REQ-303 OTP attaches pending once; first payment converts once, renewal never duplicates', async () => {
    const email = `ref-${crypto.randomUUID()}@test.vn`;
    expect((await post('/auth/register/personal', personal(email, 'OPCAN26'))).status).toBe(202);
    const res = await post('/auth/otp/verify', { email, code: '123456' });
    expect(res.status).toBe(200);
    const user = loginResponseSchema.parse(await res.json()).me;
    const list = () => fetch(`${BASE}/me/affiliate/referrals`, { headers: as('m1') });
    expect(affiliateReferralsSchema.parse(await (await list()).json()).items[0]).toMatchObject({
      name: 'Nguyễn Trà M.',
      status: 'pending',
    });
    feeAction(user.id, 'collect');
    let rows = affiliateReferralsSchema.parse(await (await list()).json());
    expect(rows.items).toHaveLength(1);
    // D-70: 20% × phí Gói Cá nhân thực đóng 1.200.000
    expect(rows.items[0]).toMatchObject({ status: 'recorded', commission: 240000 });
    feeAction(user.id, 'renew');
    rows = affiliateReferralsSchema.parse(await (await list()).json());
    expect(rows.total).toBe(1);
    expect(rows.summary.commission).toBe(240000);
    expect(myMockAffiliate(user.id, location.origin).state).toBe('active');
  });
  it('REQ-303 SSO complete attaches referral; D-110 OTP still activates after agent fee expires', async () => {
    const sso = await post('/auth/sso/complete', {
      ssoToken: 'sso.google',
      accountType: 'business',
      phone: { country: 'vn', number: '' },
      groupIds: ['c1'],
      agreeTerms: true,
      referralCode: 'OPCAN26',
    });
    expect(sso.status).toBe(200);
    expect(loginResponseSchema.parse(await sso.json()).me.accountType).toBe('business');
    const email = `pause-${crypto.randomUUID()}@test.vn`;
    expect((await post('/auth/register/personal', personal(email, 'OPCAN26'))).status).toBe(202);
    const owner = mockDb().fees.find((f) => f.userId === 'm1');
    if (!owner) throw new Error('Missing m1');
    owner.status = 'expired';
    expect((await post('/auth/otp/verify', { email, code: '123456' })).status).toBe(200);
    const list = affiliateReferralsSchema.parse(
      await (await fetch(`${BASE}/me/affiliate/referrals`, { headers: as('m1') })).json(),
    );
    expect(list.items).toHaveLength(2);
    expect(list.items.map((r) => r.name)).toContain('Thành viên S.');
  });
  it('REQ-309 bank normalizes holder, validates fields and resets with the mock DB', async () => {
    const res = await fetch(`${BASE}/me/affiliate/bank`, {
      method: 'PUT',
      headers: { ...as('m1'), 'Content-Type': 'application/json' },
      body: JSON.stringify({ bankName: 'ACB', bankNo: '0123456789', bankHolder: 'nguyễn  văn an' }),
    });
    expect(res.status).toBe(200);
    expect(affiliateBankSchema.parse(await res.json()).bankHolder).toBe('NGUYEN VAN AN');
    const invalid = await fetch(`${BASE}/me/affiliate/bank`, {
      method: 'PUT',
      headers: { ...as('m1'), 'Content-Type': 'application/json' },
      body: JSON.stringify({ bankName: 'Bad', bankNo: 'abc', bankHolder: '1' }),
    });
    expect(invalid.status).toBe(400);
    expect(apiErrorSchema.parse(await invalid.json()).error.fields?.length).toBeGreaterThan(0);
    resetMockDb();
    expect(myMockAffiliate('m1', location.origin)).toMatchObject({
      bank: { bankName: 'Vietcombank' },
      stats: { clicks30d: 0 },
    });
  });
});
