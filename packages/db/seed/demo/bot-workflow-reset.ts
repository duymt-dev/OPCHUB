import type { DbTx } from '../../src/client';

/** Called only inside the guarded, transactional demo reset, never by runtime services. */
export async function resetDemoBotWorkflows(tx: DbTx): Promise<void> {
  // Items cascade with batches. Saved-script markers must not survive a fresh demo catalog.
  await tx.botBulkBatch.deleteMany({});
  await tx.botConversationType.deleteMany({});
  await tx.botReplyRun.deleteMany({});
  await tx.botRotationCursor.deleteMany({});
}
