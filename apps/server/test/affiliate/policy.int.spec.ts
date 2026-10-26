import { AffiliateLifecycleHandler } from '@/modules/affiliate';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  affiliateCodeResultSchema,
  affiliatePolicySchema,
  type AffiliatePolicy,
} from '@opchub/shared/api-domains';
import { apiErrorSchema } from '@opchub/shared/api';
import { confirmFee, createAffiliate, createAffiliateApp } from '../factories/affiliate.factory';
import { affiliateAdminToken } from '../factories/affiliate-admin.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import type { TestApp } from '../setup/test-app';

describe('Affiliate policy API (TIP-V2-402)', () => {
  let t: TestApp;
  let original: AffiliatePolicy;
  beforeAll(async () => {
    t = await createAffiliateApp();
    original = affiliatePolicySchema.parse(
      await t.prisma.db.affiliatePolicy.findUniqueOrThrow({ where: { id: 1 } }),
    );
  });
  afterAll(async () => {
    await t.prisma.db.affiliatePolicy.update({ where: { id: 1 }, data: original });
    await t.close();
  });
  beforeEach(async () => {
    await flushAuthState(t);
  });

  it('REQ-308 chính sách mặc định chỉ áp đại lý mới, audit chứa before/after', async () => {
    const prior = await createAffiliate(t, new Date());
    const { token, user } = await affiliateAdminToken(t);
    const next = {
      defaultRate: 27,
      cookieDays: 45,
      fundraisingRate: 12,
      terms: 'Điều khoản Affiliate thử nghiệm',
    };
    const res = await t.call('/admin/affiliate/policy', { method: 'PUT', token, json: next });
    expect(res.status).toBe(200);
    expect(affiliatePolicySchema.parse(await res.json())).toEqual(next);
    expect(
      affiliatePolicySchema.parse(
        await (await t.call('/admin/affiliate/policy', { token })).json(),
      ),
    ).toEqual(next);
    expect(
      (await t.prisma.db.affiliate.findUniqueOrThrow({ where: { id: prior.affiliate.id } })).rate,
    ).toBe(20);
    const created = await createUser(t, { fee: 'pending_payment' });
    await t.app
      .get(AffiliateLifecycleHandler)
      .onFeeConfirmed(await confirmFee(t, created.id, new Date()));
    expect(
      (await t.prisma.db.affiliate.findUniqueOrThrow({ where: { userId: created.id } })).rate,
    ).toBe(27);
    const publicCode = affiliateCodeResultSchema.parse(
      await (await t.call(`/public/affiliate/codes/${prior.affiliate.code}`)).json(),
    );
    expect(publicCode).toMatchObject({ valid: true, cookieDays: 45 });
    const audit = await t.prisma.db.auditLog.findFirstOrThrow({
      where: { actorId: user.id, action: 'affiliate.policy_update' },
    });
    expect(audit.diff).toMatchObject({ before: original, after: next });
  });

  it('D-63 quyền chỉ xem, field validation, giới hạn payload, không ghi khi lỗi', async () => {
    const viewer = await affiliateAdminToken(t, { adminPermissions: ['affiliate.view'] });
    const admin = await affiliateAdminToken(t);
    expect(
      (
        await t.call('/admin/affiliate/policy', {
          method: 'PUT',
          token: viewer.token,
          json: original,
        })
      ).status,
    ).toBe(403);
    for (const patch of [
      { defaultRate: 0 },
      { defaultRate: 51 },
      { cookieDays: 366 },
      { fundraisingRate: 0 },
      { fundraisingRate: 51 },
      { terms: 'x'.repeat(5001) },
    ]) {
      const res = await t.call('/admin/affiliate/policy', {
        method: 'PUT',
        token: admin.token,
        json: { ...original, ...patch },
      });
      expect(res.status).toBe(400);
      expect(apiErrorSchema.parse(await res.json()).error.fields?.[0]?.path).toBe(
        Object.keys(patch)[0],
      );
    }
    expect(
      (
        await t.call('/admin/affiliate/policy', {
          method: 'PUT',
          token: admin.token,
          json: { ...original, terms: 'x'.repeat(800000) },
        })
      ).status,
    ).toBe(413);
    expect(
      await t.prisma.db.auditLog.count({
        where: { actorId: admin.user.id, action: 'affiliate.policy_update' },
      }),
    ).toBe(0);
  });
});
