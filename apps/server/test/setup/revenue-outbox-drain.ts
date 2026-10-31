import type { INestApplicationContext } from '@nestjs/common';
import type { Env } from '@/common/config';
import { OutboxRelayService } from '@/common/outbox';
import { OutboxRepository } from '@/common/outbox/outbox.repository';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RevenueSharingHandler, RevenuePayoutNotifyHandler } from '@/modules/affiliate';

const types = ['affiliate.revenue_received', 'affiliate.revenue_payout_recorded'];

export function assertRevenueTestTarget(env: Pick<Env, 'DATABASE_URL' | 'REDIS_DB' | 'NODE_ENV'>) {
  const url = new URL(env.DATABASE_URL);
  if (
    env.NODE_ENV !== 'test' ||
    env.REDIS_DB !== 2 ||
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    url.port !== '5432' ||
    url.pathname !== '/opchub_test'
  )
    throw new Error('Revenue teardown requires native opchub_test:5432 and Redis2 in test mode');
}

/** API tests intentionally do not run a worker. Finish captured work before the DB seed suite. */
export async function drainRevenueTestOutbox(app: Pick<INestApplicationContext, 'get'>) {
  const prisma = app.get(PrismaService);
  // A dedicated real relay does not unregister or dispatch unrelated test consumers.
  const relay = new OutboxRelayService(new OutboxRepository(prisma));
  relay.register('affiliate.revenue_received', (p) => app.get(RevenueSharingHandler).received(p));
  relay.register('affiliate.revenue_payout_recorded', (p) =>
    app.get(RevenuePayoutNotifyHandler).recorded(p),
  );
  const pending = () =>
    prisma.db.outboxEvent.count({ where: { type: { in: types }, dispatchedAt: null } });
  const initial = await pending();
  let remaining = initial;
  while (remaining > 0) {
    await relay.relayOnce();
    const next = await pending();
    if (next >= remaining)
      throw new Error(
        `Revenue teardown cannot drain ${next} pending events; inspect lease/handler errors`,
      );
    remaining = next;
  }
  return initial;
}
