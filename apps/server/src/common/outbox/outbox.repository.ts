import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface PendingEvent {
  id: bigint;
  type: string;
  payload: unknown;
  attempts: number;
}

/**
 * Truy vấn relay — index partial `outbox_pending (id) WHERE dispatched_at IS NULL`.
 * Mỗi câu autocommit: relay không giữ transaction trong lúc gọi handler (TD-019).
 */
@Injectable()
export class OutboxRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Nhận lô sự kiện chưa gửi bằng lease: đặt `locked_until` để relay khác bỏ qua tới khi hết hạn.
   * Chỉ nhận loại đã có handler — loại chưa có consumer giữ nguyên chờ replay (TD-023).
   */
  async claim(types: string[], limit: number, leaseSec: number): Promise<PendingEvent[]> {
    if (types.length === 0) return [];
    const rows = await this.prisma.db.$queryRaw<PendingEvent[]>`
      UPDATE outbox_events SET locked_until = now() + ${leaseSec} * interval '1 second'
      WHERE id IN (
        SELECT id FROM outbox_events
        WHERE dispatched_at IS NULL
          AND (locked_until IS NULL OR locked_until < now())
          AND type = ANY(${types}::text[])
        ORDER BY id
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED)
      RETURNING id, type, payload, attempts`;
    return rows.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  }

  async markDispatched(ids: bigint[]): Promise<void> {
    if (ids.length === 0) return;
    await this.prisma.db.$executeRaw`
      UPDATE outbox_events SET dispatched_at = now(), locked_until = NULL
      WHERE id = ANY(${ids}::bigint[])`;
  }

  /** Lỗi: tăng `attempts`, hoãn tới hết backoff (relay không nhận lại trước hạn) */
  async markFailed(id: bigint, error: string, retryInSec: number): Promise<void> {
    await this.prisma.db.$executeRaw`
      UPDATE outbox_events SET attempts = attempts + 1, last_error = ${error.slice(0, 500)},
        locked_until = now() + ${retryInSec} * interval '1 second'
      WHERE id = ${id}`;
  }
}
