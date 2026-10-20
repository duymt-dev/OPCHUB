import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';

/** Caller holds the shared execution lock; only terminal history may be pruned. */
@Injectable()
export class BotRetentionService {
  async reserve(tx: DbTx, requested: number): Promise<number> {
    if (!requested) return 0;
    const active = await tx.botThread.count({
      where: { status: { in: ['scheduled', 'running'] } },
    });
    const allowed = Math.min(requested, Math.max(0, 30 - active));
    if (!allowed) return 0;
    const total = await tx.botThread.count();
    const remove = Math.max(0, total + allowed - 30);
    if (remove)
      await tx.$executeRaw`
      DELETE FROM bot_threads WHERE id IN (
        SELECT id FROM bot_threads WHERE status = 'done' ORDER BY created_at, id LIMIT ${remove}
      )`;
    return allowed;
  }
}
