import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { affiliateReferralsSchema } from '@opchub/shared/api-domains';
import { MeAffiliateService } from '@/modules/affiliate/services/me-affiliate.service';
import {
  createAffiliate,
  createAffiliateApp,
  createReferral,
} from '../factories/affiliate.factory';
import type { TestApp } from '../setup/test-app';

describe('TIP-V46-804 Portal rows per commission', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createAffiliateApp();
  });
  afterAll(() => t.close());
  it('membership renewals + fundraising + unmatched pending referral, stable IDs and source month', async () => {
    const { user, affiliate } = await createAffiliate(t, new Date());
    const customer = await createReferral(t, affiliate.id, affiliate.code);
    await createReferral(t, affiliate.id, affiliate.code);
    const first = await t.prisma.db.membershipFeePeriod.create({
      data: {
        userId: customer.id,
        startsAt: new Date('2025-09-01'),
        endsAt: new Date('2026-09-01'),
        amount: 1200000,
        source: 'manual',
        reason: 'TIP-804 query fixture',
      },
    });
    const renewal = await t.prisma.db.membershipFeePeriod.create({
      data: {
        userId: customer.id,
        startsAt: new Date('2026-09-01'),
        endsAt: new Date('2027-09-01'),
        amount: 1200000,
        source: 'manual',
        reason: 'TIP-804 query fixture',
      },
    });
    const project = await t.prisma.db.project.create({
      data: { ownerId: customer.id, name: 'Portal source test' },
    });
    const fund = await t.prisma.db.projectFundraising.create({
      data: {
        ownerId: customer.id,
        projectId: project.id,
        amount: 15000000,
        status: 'pending_review',
      },
    });
    const common = {
      affiliateId: affiliate.id,
      referredUserId: customer.id,
      listAmount: 1200000,
      amount: 240000,
      rate: 20,
      monthKey: '2026-09',
      plan: 'personal' as const,
    };
    await t.prisma.db.commission.createMany({
      data: [
        {
          ...common,
          id: randomUUID(),
          feePeriodId: first.id,
          source: 'membership',
          customerYear: 1,
        },
        {
          ...common,
          id: randomUUID(),
          feePeriodId: renewal.id,
          source: 'membership',
          customerYear: 2,
          rate: 10,
          amount: 120000,
        },
        {
          ...common,
          id: randomUUID(),
          fundraisingId: fund.id,
          source: 'fundraising',
          plan: 'fundraising',
          monthKey: '2026-10',
          customerYear: 2,
          rate: 10,
          amount: 1500000,
        },
      ],
    });
    const service = t.app.get(MeAffiliateService);
    const all = affiliateReferralsSchema.parse(
      await service.referrals(user.id, { page: 1, size: 10 }),
    );
    expect(all.total).toBe(4);
    expect(new Set(all.items.map((r) => r.id)).size).toBe(4);
    expect(all.items.filter((r) => r.source === 'fundraising')).toHaveLength(1);
    expect(all.items.filter((r) => r.customerYear === 2)).toHaveLength(2);
    expect(all.items.filter((r) => r.status === 'pending')).toHaveLength(1);
    const september = await service.referrals(user.id, { page: 1, size: 10, month: '2026-09' });
    expect(september.total).toBe(3);
    expect(september.summary.commission).toBe(360000);
    const october = await service.referrals(user.id, { page: 1, size: 10, month: '2026-10' });
    expect(october.total).toBe(1);
    expect(october.summary.commission).toBe(1500000);
    expect(october.items[0]?.customerYear).toBe(2);
  });
});
