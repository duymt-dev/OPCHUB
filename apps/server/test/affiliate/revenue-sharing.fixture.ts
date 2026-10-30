import { randomUUID } from 'node:crypto';
import type { AccountType } from '@opchub/shared';
import { parseOutboxPayload } from '@opchub/shared/outbox';
import { OutboxRelayService } from '@/common/outbox';
import {
  AffiliateCoreModule,
  RegionalDirectorService,
  RevenueSharingHandler,
} from '@/modules/affiliate';
import { MembershipFeeService } from '@/modules/membership-fee';
import { AffiliateProcessor } from '@/worker/processors/affiliate.processor';
import { createTestApp, type TestApp } from '../setup/test-app';
import { createUser } from '../factories/user.factory';
import { createGroup, addMember } from '../factories/group.factory';

export async function createRevenueApp() {
  const t = await createTestApp({
    imports: [AffiliateCoreModule],
    providers: [AffiliateProcessor],
  });
  const relay = t.app.get(OutboxRelayService);
  // Keep the actual processor-registered consumer; other domains have their own suites.
  for (const type of relay.registeredTypes()) {
    if (type !== 'affiliate.revenue_received' && type !== 'affiliate.revenue_payout_recorded')
      relay.unregister(type);
  }
  return t;
}

async function prepareRevenueCase(t: TestApp) {
  const db = t.prisma.db;
  const oldSlot = await db.regionalDirector.findUniqueOrThrow({ where: { region: 'north' } });
  const oldPolicy = await db.affiliatePolicy.findUniqueOrThrow({
    where: { id: 1 },
    select: { yearOneRate: true, annualDecrease: true, minimumRate: true },
  });
  const owned: string[] = [];
  const newMember = async (accountType: AccountType = 'personal') => {
    const u = await createUser(t, { fee: 'pending_payment', accountType });
    owned.push(u.id);
    return u;
  };
  const actor = await createUser(t, { systemRole: 'super_admin' });
  owned.push(actor.id);
  const director = await newMember();
  const referrer = await newMember();
  const group = await createGroup(t);
  await addMember(t, group.id, referrer.id);
  const affiliate = await db.affiliate.create({
    data: {
      userId: referrer.id,
      code: `R${randomUUID().replaceAll('-', '').slice(0, 11)}`.toUpperCase(),
      rate: 20,
    },
  });
  await db.regionalDirector.update({
    where: { region: 'north' },
    data: { userId: null, appointedAt: null },
  });
  await t.app.get(RegionalDirectorService).appoint(
    { id: actor.id, ip: null },
    {
      region: 'north',
      userId: director.id,
      version: oldSlot.version,
    },
    new Date('2023-01-01T00:00:00Z'),
  );
  await db.regionalDirector.update({
    where: { region: 'north' },
    data: {
      bankName: 'Vietcombank',
      bankNo: '0123456789',
      bankHolder: 'DIRECTOR',
    },
  });
  await db.regionalDirectorProvince.create({ data: { province: group.province, region: 'north' } });
  await db.affiliatePolicy.update({
    where: { id: 1 },
    data: {
      yearOneRate: 50,
      annualDecrease: 10,
      minimumRate: 20,
    },
  });

  return { db, oldSlot, oldPolicy, owned, newMember, actor, director, referrer, group, affiliate };
}

function revenueActions(t: TestApp) {
  const db = t.prisma.db;
  const payload = async (sourceId: string) => {
    const event = await db.outboxEvent.findFirstOrThrow({
      where: {
        type: 'affiliate.revenue_received',
        payload: { path: ['receipt', 'sourceId'], equals: sourceId },
      },
      orderBy: { id: 'desc' },
      select: { id: true, payload: true },
    });
    return { id: event.id, data: parseOutboxPayload('affiliate.revenue_received', event.payload) };
  };
  const collect = async (userId: string, at: string, amount = 101) => {
    await db.$transaction((tx) =>
      t.app.get(MembershipFeeService).activate(
        tx,
        {
          userId,
          source: 'manual',
          amount,
          reason: 'REQ-617 actual collection',
        },
        new Date(at),
      ),
    );
    return db.membershipFeePeriod.findFirstOrThrow({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  };
  const deliver = async (sourceId: string) => {
    const event = await payload(sourceId);
    await t.app.get(RevenueSharingHandler).received(event.data);
    return db.revenueShare.findUniqueOrThrow({
      where: { source_sourceId: { source: event.data.receipt.source, sourceId } },
    });
  };
  return { collect, payload, deliver };
}

export async function createRevenueCase(t: TestApp) {
  const { db, oldSlot, oldPolicy, owned, newMember, actor, director, referrer, group, affiliate } =
    await prepareRevenueCase(t);
  const customer = async (accountType: AccountType = 'personal') => {
    const u = await newMember(accountType);
    await db.referral.create({
      data: {
        affiliateId: affiliate.id,
        affiliateCode: affiliate.code,
        referredUserId: u.id,
        monthKey: '2026-01',
      },
    });
    return u;
  };
  const cleanup = async () => {
    const payouts = await db.revenuePayout.findMany({
      where: { directorId: { in: owned } },
      select: { id: true },
    });
    if (payouts.length)
      await db.outboxEvent.deleteMany({
        where: {
          type: 'affiliate.revenue_payout_recorded',
          OR: payouts.map(({ id }) => ({ payload: { path: ['payoutId'], equals: id } })),
        },
      });
    await db.revenueShare.deleteMany({ where: { customerId: { in: owned } } });
    await db.revenuePayout.deleteMany({ where: { directorId: { in: owned } } });
    await db.revenueRecipientBank.deleteMany({ where: { directorId: { in: owned } } });
    await db.outboxEvent.deleteMany({
      where: {
        type: 'affiliate.revenue_received',
        OR: owned.map((id) => ({ payload: { path: ['receipt', 'customerId'], equals: id } })),
      },
    });
    await db.regionalDirectorProvince.deleteMany({ where: { province: group.province } });
    await db.regionalDirector.update({ where: { region: 'north' }, data: oldSlot });
    await db.affiliatePolicy.update({ where: { id: 1 }, data: oldPolicy });
    await db.project.deleteMany({ where: { ownerId: { in: owned } } });
    await db.group.delete({ where: { id: group.id } });
    await db.adminUser.deleteMany({ where: { id: { in: owned } } });
    await db.user.deleteMany({ where: { id: { in: owned } } });
  };
  return {
    director,
    referrer,
    affiliate,
    group,
    actor,
    customer,
    newMember,
    ...revenueActions(t),
    cleanup,
  };
}
export type RevenueCase = Awaited<ReturnType<typeof createRevenueCase>>;
