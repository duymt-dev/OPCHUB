import { randomUUID } from 'node:crypto';
import { RegionalDirectorService, RegionalShareLedgerService } from '@/modules/regional-director';
import type { RegionalRegion } from '@opchub/shared/api-domains';
import type { TestApp } from '../setup/test-app';
import { createUser } from './user.factory';

export async function regionalShareFixture(t: TestApp, region: RegionalRegion = 'north') {
  const actor = await createUser(t, { systemRole: 'super_admin' });
  const director = await createUser(t, { fee: 'trial' });
  const agent = await createUser(t, { fee: 'active' });
  const customer = await createUser(t, { fee: 'pending_payment' });
  const affiliate = await t.prisma.db.affiliate.create({
    data: {
      userId: agent.id,
      code: `R${randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase()}`,
      rate: 20,
    },
  });
  await t.prisma.db.referral.create({
    data: {
      affiliateId: affiliate.id,
      affiliateCode: affiliate.code,
      referredUserId: customer.id,
      monthKey: '2026-11',
    },
  });
  const group = await t.prisma.db.group.findFirstOrThrow({
    where: { kind: 'province', region, deletedAt: null },
    select: { id: true, province: true },
  });
  await t.prisma.db.groupMember.create({
    data: {
      groupId: group.id,
      userId: agent.id,
      status: 'member',
      createdAt: new Date('2020-01-01'),
    },
  });
  const who = { id: actor.id, role: 'Super Admin', ip: null };
  await t.app
    .get(RegionalDirectorService)
    .appoint(who, region, director.id, new Date('2020-01-01'));
  await t.app.get(RegionalDirectorService).patch(who, region, {
    bank: { bankName: 'Vietcombank', bankNo: '123456789012', bankHolder: 'REGIONAL DIRECTOR' },
  });
  const input = {
    source: 'membership' as const,
    sourceId: randomUUID(),
    customerId: customer.id,
    baseAmount: 1_200_000,
    plan: 'personal' as const,
    at: new Date('2026-10-02T00:00:00Z'),
  };
  return {
    actor,
    director,
    agent,
    affiliate,
    customer,
    group,
    who,
    region,
    input,
    ledger: t.app.get(RegionalShareLedgerService),
  };
}
