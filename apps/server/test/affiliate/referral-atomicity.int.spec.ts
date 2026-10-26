import { randomUUID } from 'node:crypto';
import { registerPersonalSchema } from '@opchub/shared/api';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppError } from '@/common/errors';
import { fromPersonal } from '@/modules/account/domain/register.mapper';
import { RegistrationRepository } from '@/modules/account/repositories/registration.repository';
import { RegisterService } from '@/modules/account/services/register.service';
import { ReferralCodeService } from '@/modules/affiliate/services/referral-code.service';
import { createAffiliate, createAffiliateApp } from '../factories/affiliate.factory';
import { flushAuthState } from '../factories/user.factory';
import type { TestApp } from '../setup/test-app';

const registration = (email: string, referralCode: string) =>
  fromPersonal(
    registerPersonalSchema.parse({
      email,
      referralCode,
      fullName: 'Thành viên giới thiệu',
      password: '',
      phone: { country: 'vn', number: '' },
      persona: 'expert',
      groupIds: ['c1'],
      agreeTerms: true,
    }),
    null,
  );

describe('Referral registration atomicity (TIP-V2-402)', () => {
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

  it('REQ-303 hai activation cùng email, khác mã: một user/phí/referral, không gắn lại mã thua', async () => {
    const first = await createAffiliate(t, new Date());
    const second = await createAffiliate(t, new Date());
    const email = `${randomUUID()}@test.opchub.vn`;
    const activate = (code: string) =>
      t.app
        .get(RegisterService)
        .activate(registration(email, code), { ip: null, userAgent: 'Affiliate atomicity test' });
    const results = await Promise.allSettled([
      activate(first.affiliate.code),
      activate(second.affiliate.code),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const failure = results.find((r) => r.status === 'rejected');
    if (failure?.status !== 'rejected') throw new Error('Missing losing activation');
    const reason: unknown = failure.reason;
    expect(reason).toBeInstanceOf(AppError);
    if (!(reason instanceof AppError)) throw new Error('Unexpected registration failure');
    expect(reason.code).toBe('CONFLICT');
    const users = await t.prisma.db.user.findMany({ where: { email } });
    expect(users).toHaveLength(1);
    const user = users[0];
    if (!user) throw new Error('Missing activated member');
    expect(await t.prisma.db.membershipFee.count({ where: { userId: user.id } })).toBe(1);
    const refs = await t.prisma.db.referral.findMany({ where: { referredUserId: user.id } });
    expect(refs).toHaveLength(1);
    expect([first.affiliate.id, second.affiliate.id]).toContain(refs[0]?.affiliateId);
    expect(refs[0]?.status).toBe('pending');
  });

  it('REQ-303 attach thất bại rollback user/consent vừa tạo cùng transaction', async () => {
    const email = `${randomUUID()}@test.opchub.vn`;
    const reg = registration(email, 'UNKNOWN999');
    await expect(
      t.prisma.db.$transaction(async (tx) => {
        const user = await t.app.get(RegistrationRepository).create(tx, {
          reg,
          verification: null,
          lookupRaw: null,
          emailVerifiedAt: new Date(),
          ip: null,
          opcIntent: [],
        });
        await t.app.get(ReferralCodeService).attach(tx, user.id, reg.referralCode ?? '');
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(await t.prisma.db.user.findUnique({ where: { email } })).toBeNull();
  });
});
