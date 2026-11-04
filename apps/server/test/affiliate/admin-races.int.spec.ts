import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuditService } from '@/common/audit';
import { CommissionAdminService } from '@/modules/affiliate/services/commission-admin.service';
import { createAffiliateApp } from '../factories/affiliate.factory';
import { affiliateAdminToken, affiliateEarning } from '../factories/affiliate-admin.factory';
import { flushAuthState } from '../factories/user.factory';
import type { TestApp } from '../setup/test-app';

describe('Affiliate mutations atomicity/concurrency (TIP-V2-402)', () => {
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

  it('luật 8/10: audit thất bại rollback cả mutation và outbox', async () => {
    const owner = await affiliateEarning(t);
    const { user } = await affiliateAdminToken(t);
    const before = await t.prisma.db.outboxEvent.count({
      where: { type: 'affiliate.rate_changed' },
    });
    const failure = new Error('Test audit unavailable');
    const spy = vi.spyOn(t.app.get(AuditService), 'log').mockRejectedValueOnce(failure);
    try {
      await expect(
        t.app.get(CommissionAdminService).rate({ id: user.id, ip: null }, [owner.affiliate.id], 30),
      ).rejects.toBe(failure);
    } finally {
      spy.mockRestore();
    }
    expect(
      (await t.prisma.db.affiliate.findUniqueOrThrow({ where: { id: owner.affiliate.id } })).rate,
    ).toBe(20);
    expect(
      (await t.prisma.db.commission.findUniqueOrThrow({ where: { id: owner.commission.id } }))
        .amount,
    ).toBe(240000);
    expect(await t.prisma.db.outboxEvent.count({ where: { type: 'affiliate.rate_changed' } })).toBe(
      before,
    );
  });
});
