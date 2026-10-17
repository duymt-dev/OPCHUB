import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';

export interface PendingEvent {
  id: bigint;
  type: string;
  payload: unknown;
  attempts: number;
}

/** Truy vấn relay — index partial `outbox_pending (id) WHERE dispatched_at IS NULL` */
@Injectable()
export class OutboxRepository {
  /** Khoá lô sự kiện chưa gửi; relay khác chạy song song bỏ qua dòng đang khoá */
  lockPending(tx: DbTx, limit: number): Promise<PendingEvent[]> {
    return tx.$queryRaw<PendingEvent[]>`
      SELECT id, type, payload, attempts FROM outbox_events
      WHERE dispatched_at IS NULL
      ORDER BY id
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED`;
  }

  async markDispatched(tx: DbTx, ids: bigint[]): Promise<void> {
    if (ids.length === 0) return;
    await tx.$executeRaw`
      UPDATE outbox_events SET dispatched_at = now() WHERE id = ANY(${ids}::bigint[])`;
  }

  async markFailed(tx: DbTx, ids: bigint[], error: string): Promise<void> {
    if (ids.length === 0) return;
    await tx.$executeRaw`
      UPDATE outbox_events SET attempts = attempts + 1, last_error = ${error.slice(0, 500)}
      WHERE id = ANY(${ids}::bigint[])`;
  }
}
