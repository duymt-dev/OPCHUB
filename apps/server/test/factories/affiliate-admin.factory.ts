import { AffiliateLifecycleHandler } from '@/modules/affiliate';
import { OutboxRelayService } from '@/common/outbox';
import type { TestApp } from '../setup/test-app';
import { confirmFee, createAffiliate, createReferral } from './affiliate.factory';
import { createUser, loginOf, tokenBodySchema, type UserSpec } from './user.factory';

export const AFFILIATE_BANK = {
  bankName: 'Vietcombank',
  bankNo: '012345678901',
  bankHolder: 'NGUYEN VAN AN',
} as const;
export const EARNING_DATE = new Date('2026-09-15T04:00:00Z');

export async function affiliateAdminToken(
  t: TestApp,
  spec: UserSpec = { systemRole: 'super_admin' },
) {
  const user = await createUser(t, spec);
  return { user, token: tokenBodySchema.parse(await (await loginOf(t, user)).json()).accessToken };
}

export async function affiliateEarning(
  t: TestApp,
  owner?: Awaited<ReturnType<typeof createAffiliate>>,
) {
  const o = owner ?? (await createAffiliate(t, EARNING_DATE));
  const customer = await createReferral(t, o.affiliate.id, o.affiliate.code);
  await t.app
    .get(AffiliateLifecycleHandler)
    .onFeeConfirmed(await confirmFee(t, customer.id, EARNING_DATE));
  const commission = await t.prisma.db.commission.findFirstOrThrow({
    where: { referredUserId: customer.id, source: 'membership' },
  });
  return { ...o, customer, commission };
}

/** Đi qua consumer đã đăng ký, không thay relay bằng handler giả. */
export async function relayAffiliateEvent(t: TestApp, id: bigint) {
  for (let i = 0; i < 30; i++) {
    await t.app.get(OutboxRelayService).relayOnce();
    const event = await t.prisma.db.outboxEvent.findUniqueOrThrow({ where: { id } });
    if (event.dispatchedAt) return;
  }
  throw new Error(`Affiliate outbox ${id} chưa dispatched`);
}
