import { parseOutboxPayload } from '@opchub/shared/outbox';
import { MembershipFeeService } from '@/modules/membership-fee';
import {
  AffiliateCoreModule,
  AffiliateLifecycleHandler,
  AffiliateNotifyHandler,
} from '@/modules/affiliate';
import { AffiliateProcessor } from '@/worker/processors/affiliate.processor';
import { createTestApp, type TestApp } from '../setup/test-app';
import { createUser } from './user.factory';

export const createAffiliateApp = () =>
  createTestApp({
    imports: [AffiliateCoreModule],
    providers: [AffiliateProcessor],
  });

/** Tạo kỳ phí qua service thật, không tự dựng sự kiện giả. */
export async function confirmFee(t: TestApp, userId: string, now: Date, amount = 600_000) {
  await t.prisma.db.$transaction((tx) =>
    t.app.get(MembershipFeeService).activate(
      tx,
      {
        userId,
        source: 'manual',
        amount,
        reason: 'Affiliate integration test',
      },
      now,
    ),
  );
  const event = await t.prisma.db.outboxEvent.findFirstOrThrow({
    where: { type: 'membership_fee.confirmed', payload: { path: ['userId'], equals: userId } },
    orderBy: { id: 'desc' },
    select: { payload: true },
  });
  return parseOutboxPayload('membership_fee.confirmed', event.payload);
}

export async function createAffiliate(t: TestApp, now: Date, rate = 20) {
  const user = await createUser(t, { fee: 'pending_payment' });
  const payload = await confirmFee(t, user.id, now);
  await t.app.get(AffiliateLifecycleHandler).onFeeConfirmed(payload);
  const affiliate = await t.prisma.db.affiliate.update({
    where: { userId: user.id },
    data: { rate },
  });
  return { user, affiliate };
}

export async function createReferral(t: TestApp, affiliateId: string, code: string) {
  const user = await createUser(t, { fee: 'pending_payment' });
  await t.prisma.db.referral.create({
    data: {
      affiliateId,
      affiliateCode: code,
      referredUserId: user.id,
      monthKey: '2026-09',
    },
  });
  return user;
}

export async function deliverCommission(t: TestApp, commissionId: string) {
  const handler = t.app.get(AffiliateNotifyHandler);
  await handler.recorded({ commissionId });
}
