import type { DbTx } from '@opchub/db';

/** Shared by scheduling, settings changes, runner and emergency stop for linearizable pause. */
export async function lockBotExecution(tx: DbTx): Promise<void> {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('opchub:bot:execution'))::text AS locked`;
}
