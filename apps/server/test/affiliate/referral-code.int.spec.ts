import { randomUUID } from 'node:crypto';
import { apiErrorSchema } from '@opchub/shared/api';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { affiliateCodeResultSchema } from '@opchub/shared/api-domains';
import { createAffiliate, createAffiliateApp } from '../factories/affiliate.factory';
import { flushAuthState } from '../factories/user.factory';
import type { TestApp } from '../setup/test-app';

describe('Mã giới thiệu, click và đăng ký (TIP-V2-402)', () => {
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
  const personal = (email: string, code: string) => ({
    email,
    fullName: 'Thành viên giới thiệu',
    phone: { country: 'vn', number: '' },
    password: '',
    persona: 'expert',
    groupIds: ['c1'],
    agreeTerms: true,
    referralCode: code,
  });

  it('AT-AF03 REQ-304 đủ ba lỗi: không tồn tại, tự giới thiệu, paused; không gửi OTP', async () => {
    const { affiliate, user } = await createAffiliate(t, new Date());
    for (const [code, email, reason] of [
      ['UNKNOWN999', `${randomUUID()}@test.opchub.vn`, 'not_found'],
      [affiliate.code, user.email.toUpperCase(), 'self'],
    ] as const) {
      const result = affiliateCodeResultSchema.parse(
        await (
          await t.call(`/public/affiliate/codes/${code}?email=${encodeURIComponent(email ?? '')}`)
        ).json(),
      );
      expect(result).toMatchObject({ valid: false, reason });
      const res = await t.call('/auth/register/personal', {
        method: 'POST',
        json: personal(email ?? '', code ?? ''),
      });
      expect(res.status).toBe(400);
      expect(apiErrorSchema.parse(await res.json()).error.fields?.[0]?.path).toBe('referralCode');
      expect(
        await t.prisma.db.mailLog.count({ where: { to: email?.toLowerCase(), kind: 'otp' } }),
      ).toBe(0);
    }
    await t.prisma.db.membershipFee.update({
      where: { userId: user.id },
      data: { validUntil: new Date('2020-01-01') },
    });
    const email = `${randomUUID()}@test.opchub.vn`;
    expect(
      affiliateCodeResultSchema.parse(
        await (await t.call(`/public/affiliate/codes/${affiliate.code}`)).json(),
      ),
    ).toMatchObject({ valid: false, reason: 'paused' });
    expect(
      (
        await t.call('/auth/register/personal', {
          method: 'POST',
          json: personal(email, affiliate.code),
        })
      ).status,
    ).toBe(400);
  });

  it('REQ-303 OTP gắn referral đúng user trong transaction; kiểm lại nếu đại lý tạm dừng trước verify', async () => {
    const { affiliate } = await createAffiliate(t, new Date());
    const email = `${randomUUID()}@test.opchub.vn`;
    expect(
      (
        await t.call('/auth/register/personal', {
          method: 'POST',
          json: personal(email, affiliate.code.toLowerCase()),
        })
      ).status,
    ).toBe(202);
    expect(
      (await t.call('/auth/otp/verify', { method: 'POST', json: { email, code: '123456' } }))
        .status,
    ).toBe(200);
    const user = await t.prisma.db.user.findUniqueOrThrow({ where: { email } });
    expect(
      await t.prisma.db.referral.findUniqueOrThrow({ where: { referredUserId: user.id } }),
    ).toMatchObject({
      affiliateId: affiliate.id,
      affiliateCode: affiliate.code,
      status: 'pending',
    });
    const blockedEmail = `${randomUUID()}@test.opchub.vn`;
    expect(
      (
        await t.call('/auth/register/personal', {
          method: 'POST',
          json: personal(blockedEmail, affiliate.code),
        })
      ).status,
    ).toBe(202);
    await t.prisma.db.affiliate.update({ where: { id: affiliate.id }, data: { status: 'paused' } });
    expect(
      (
        await t.call('/auth/otp/verify', {
          method: 'POST',
          json: { email: blockedEmail, code: '123456' },
        })
      ).status,
    ).toBe(400);
    expect(await t.prisma.db.user.findUnique({ where: { email: blockedEmail } })).toBeNull();
  });

  it('REQ-303 click một lần/IP+mã/giờ; paused không tăng, JSON quá cỡ bị chặn', async () => {
    const { affiliate } = await createAffiliate(t, new Date());
    const click = () =>
      t.call('/public/affiliate/click', { method: 'POST', json: { code: affiliate.code } });
    expect((await click()).status).toBe(204);
    expect((await click()).status).toBe(204);
    expect(
      (
        await t.prisma.db.affiliateClickDaily.aggregate({
          where: { affiliateId: affiliate.id },
          _sum: { count: true },
        })
      )._sum.count,
    ).toBe(1);
    await t.prisma.db.affiliate.update({ where: { id: affiliate.id }, data: { status: 'paused' } });
    expect((await click()).status).toBe(204);
    expect(
      (
        await t.prisma.db.affiliateClickDaily.aggregate({
          where: { affiliateId: affiliate.id },
          _sum: { count: true },
        })
      )._sum.count,
    ).toBe(1);
    expect(
      (await t.call('/public/affiliate/click', { method: 'POST', json: { code: 'bad!' } })).status,
    ).toBe(400);
    expect(
      (
        await t.call('/public/affiliate/click', {
          method: 'POST',
          json: { code: 'A'.repeat(800000) },
        })
      ).status,
    ).toBe(413);
  });
});
