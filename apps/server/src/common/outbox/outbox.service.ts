import { Injectable } from '@nestjs/common';
import type { DbTx, Prisma } from '@opchub/db';
import {
  parseOutboxPayload,
  type OutboxEventType,
  type OutboxPayload,
} from '@opchub/shared/outbox';

/**
 * ADR-0005: hiệu ứng phụ quan trọng ghi vào `outbox_events` TRONG transaction của caller.
 * Payload parse zod trước khi ghi — sai thì ném, cả transaction rollback.
 *
 *   await prisma.db.$transaction(async (tx) => {
 *     await feeRepo.activate(tx, …);
 *     await outbox.add(tx, 'membership_fee.activated', { … });
 *   });
 */
@Injectable()
export class OutboxService {
  async add<T extends OutboxEventType>(
    tx: DbTx,
    type: T,
    payload: OutboxPayload<T>,
  ): Promise<void> {
    const data = parseOutboxPayload(type, payload) as Prisma.InputJsonValue;
    await tx.outboxEvent.create({ data: { type, payload: data } });
  }

  /** Nhiều sự kiện cùng loại trong một câu INSERT (không query trong vòng lặp) */
  async addMany<T extends OutboxEventType>(
    tx: DbTx,
    type: T,
    payloads: readonly OutboxPayload<T>[],
  ): Promise<void> {
    if (!payloads.length) return;
    await tx.outboxEvent.createMany({
      data: payloads.map((p) => ({
        type,
        payload: parseOutboxPayload(type, p) as Prisma.InputJsonValue,
      })),
    });
  }
}
