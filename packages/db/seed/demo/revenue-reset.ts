import type { DbTx } from '../../src/client';

/** Demo-only, inside the reset transaction. Never delete or fake-dispatch outbox evidence. */
export async function resetDemoRevenue(tx: DbTx): Promise<void> {
  // Prevent a new capture/claim between the pending check and the demo reset commit.
  await tx.$executeRaw`LOCK TABLE outbox_events IN SHARE ROW EXCLUSIVE MODE`;
  const pending = await tx.outboxEvent.findFirst({
    where: {
      type: { in: ['affiliate.revenue_received', 'affiliate.revenue_payout_recorded'] },
      dispatchedAt: null,
    },
    select: { id: true },
  });
  if (pending) throw new Error('Demo reset requires draining pending revenue outbox events first');
  // Snapshots deliberately have no user FK; deleting users alone does not reset them.
  await tx.revenueShare.deleteMany({});
  await tx.revenuePayout.deleteMany({});
  await tx.revenueRecipientBank.deleteMany({});
  await tx.revenueCustomer.deleteMany({});
}
