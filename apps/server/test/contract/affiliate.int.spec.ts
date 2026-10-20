import { afterAll, beforeAll, describe, it } from 'vitest';
import {
  affiliateBankSchema,
  affiliateCodeResultSchema,
  affiliatePayoutsSchema,
  affiliateReferralsSchema,
  myAffiliateSchema,
} from '@opchub/shared/api-domains';
import { createAffiliate, createAffiliateApp } from '../factories/affiliate.factory';
import { flushAuthState } from '../factories/user.factory';
import { tokenOf } from '../factories/group.factory';
import type { TestApp } from '../setup/test-app';
import { ep } from './harness';

describe('Contract: affiliate portal/public (TIP-V2-402)', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createAffiliateApp();
    await flushAuthState(t);
  });
  afterAll(async () => {
    await t.close();
  });

  it('REQ-311 mỗi endpoint portal/public parse đúng schema shared', async () => {
    const { user, affiliate } = await createAffiliate(t, new Date());
    const token = await tokenOf(t, user);
    await ep(t, 'GET', '/me/affiliate', '/me/affiliate', myAffiliateSchema, { token });
    await ep(
      t,
      'GET',
      '/me/affiliate/referrals',
      '/me/affiliate/referrals',
      affiliateReferralsSchema,
      { token },
    );
    await ep(t, 'GET', '/me/affiliate/payouts', '/me/affiliate/payouts', affiliatePayoutsSchema, {
      token,
    });
    await ep(t, 'PUT', '/me/affiliate/bank', '/me/affiliate/bank', affiliateBankSchema, {
      token,
      json: { bankName: 'ACB', bankNo: '0123456789', bankHolder: 'NGUYEN VAN AN' },
    });
    await ep(
      t,
      'GET',
      '/public/affiliate/codes/:code',
      `/public/affiliate/codes/${affiliate.code}`,
      affiliateCodeResultSchema,
    );
    await ep(
      t,
      'POST',
      '/public/affiliate/click',
      '/public/affiliate/click',
      null,
      { json: { code: affiliate.code } },
      204,
    );
  });
});
