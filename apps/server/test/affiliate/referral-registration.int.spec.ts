import { randomUUID } from 'node:crypto';
import { ssoCallbackSchema } from '@opchub/shared/api';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createAffiliate, createAffiliateApp } from '../factories/affiliate.factory';
import { flushAuthState } from '../factories/user.factory';
import type { TestApp } from '../setup/test-app';
import { ssoLogin } from '../factories/sso.factory';

describe('Referral trong đăng ký DN và SSO (TIP-V2-402)', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createAffiliateApp();
  });
  afterAll(async () => {
    await t.close();
  });
  beforeEach(async () => {
    await flushAuthState(t);
  });

  it('REQ-303 đăng ký doanh nghiệp + OTP tạo referral cùng tài khoản', async () => {
    const { affiliate } = await createAffiliate(t, new Date());
    const email = `${randomUUID()}@test.opchub.vn`;
    const res = await t.call('/auth/register/business', {
      method: 'POST',
      json: {
        email,
        password: '',
        referralCode: affiliate.code,
        agreeTerms: true,
        taxCode: '0109999001',
        companyName: 'Công ty thử Affiliate',
        mainIndustry: '6201',
        otherIndustries: [],
        size: '1',
        country: 'vn',
        representative: 'Nguyễn Văn Nam',
        position: 'Giám đốc',
        phone: { country: 'vn', number: '' },
        groupIds: ['c1'],
      },
    });
    expect(res.status).toBe(202);
    expect(
      (await t.call('/auth/otp/verify', { method: 'POST', json: { email, code: '123456' } }))
        .status,
    ).toBe(200);
    const user = await t.prisma.db.user.findUniqueOrThrow({ where: { email } });
    expect(user.accountType).toBe('business');
    expect(
      await t.prisma.db.referral.findUniqueOrThrow({ where: { referredUserId: user.id } }),
    ).toMatchObject({ affiliateId: affiliate.id, status: 'pending' });
  });

  it('REQ-303 SSO complete mang referralCode, không OTP và không mất mã qua mapper', async () => {
    const { affiliate } = await createAffiliate(t, new Date());
    const email = `${randomUUID()}@test.opchub.vn`;
    const cb = ssoCallbackSchema.parse(await (await ssoLogin(t, 'google', email)).json());
    if (cb.status !== 'new') throw new Error('SSO phải là tài khoản mới');
    const res = await t.call('/auth/sso/complete', {
      method: 'POST',
      json: {
        ssoToken: cb.ssoToken,
        accountType: 'personal',
        phone: { country: 'vn', number: '' },
        groupIds: ['c1'],
        agreeTerms: true,
        referralCode: affiliate.code,
      },
    });
    expect(res.status).toBe(200);
    const user = await t.prisma.db.user.findUniqueOrThrow({ where: { email } });
    expect(
      await t.prisma.db.referral.findUniqueOrThrow({ where: { referredUserId: user.id } }),
    ).toMatchObject({ affiliateId: affiliate.id, status: 'pending' });
    expect(await t.prisma.db.mailLog.count({ where: { to: email, kind: 'otp' } })).toBe(0);
  });
});
