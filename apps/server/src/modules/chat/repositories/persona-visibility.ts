import type { DbTx } from '@opchub/db';

/** Serialize bot hide with final publication, not with human message sends. */
export async function lockPersonaVisibility(tx: DbTx): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('chat-persona-visibility'))`;
}
