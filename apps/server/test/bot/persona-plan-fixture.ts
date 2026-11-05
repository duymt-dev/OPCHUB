import type { DbTx } from '@opchub/db';
import type { TestApp } from '../setup/test-app';

/** Roll back large synthetic workloads instead of triggering per-row cascade cleanup. */
export async function withRolledBackMessages(t: TestApp, check: (db: DbTx) => Promise<void>) {
  const rollback = new Error('Rollback persona plan fixture');
  try {
    await t.prisma.db.$transaction(
      async (tx) => {
        await check(tx);
        throw rollback;
      },
      { timeout: 30_000 },
    );
  } catch (error) {
    if (error !== rollback) throw error;
  } finally {
    // ANALYZE stats survive rollback; restore statistics for subsequent integration files.
    await t.prisma.db.$executeRaw`ANALYZE messages`;
  }
}
