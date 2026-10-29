import { Injectable } from '@nestjs/common';
import { Prisma, type DbTx } from '@opchub/db';
import type { BotBulkItemsQuery } from '@opchub/shared/api-domains';

const BATCH_SELECT = {
  id: true,
  requestId: true,
  actorId: true,
  topics: true,
  typeName: true,
  typeDescription: true,
  perTopic: true,
  turns: true,
  delayMinutes: true,
  groupIds: true,
  status: true,
  total: true,
  cursor: true,
  attempts: true,
  error: true,
  claimId: true,
  leaseUntil: true,
  nextAt: true,
  createdAt: true,
  updatedAt: true,
} as const;
export type BulkBatchRow = Prisma.BotBulkBatchGetPayload<{ select: typeof BATCH_SELECT }>;
export type BulkItemRow = {
  id: string;
  ordinal: number;
  topic: string;
  lines: unknown;
  selected: boolean;
  savedScriptId: string | null;
};
export function botBulkItemsSql(batchId: string, query: BotBulkItemsQuery) {
  return Prisma.sql`
    SELECT item.id, item.ordinal, item.topic, item.lines, item.selected, item.saved_script_id AS "savedScriptId"
    FROM (
      SELECT id, ordinal FROM bot_bulk_items WHERE batch_id = ${batchId} AND ordinal > ${query.after}
      ORDER BY ordinal LIMIT ${query.limit + 1}
    ) page JOIN bot_bulk_items item ON item.id = page.id ORDER BY page.ordinal`;
}
export function botBulkRecoverySql(now: Date) {
  return Prisma.sql`
    SELECT id, cursor, attempts, next_at AS "nextAt" FROM bot_bulk_batches
    WHERE status = 'running' AND next_at <= ${now} AND (lease_until IS NULL OR lease_until <= ${now})
    ORDER BY next_at, id LIMIT 30`;
}

@Injectable()
export class BotBulkRepository {
  async lock(tx: DbTx, key: string): Promise<void> {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`bot-bulk:${key}`}, 713))`;
  }
  find(tx: DbTx, id: string) {
    return tx.botBulkBatch.findUnique({ where: { id }, select: BATCH_SELECT });
  }
  byRequest(tx: DbTx, actorId: string, requestId: string) {
    return tx.botBulkBatch.findUnique({
      where: { actorId_requestId: { actorId, requestId } },
      select: BATCH_SELECT,
    });
  }
  latest(tx: DbTx, actorId: string) {
    return tx.botBulkBatch.findFirst({
      where: { actorId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: { id: true },
    });
  }
  create(tx: DbTx, data: Prisma.BotBulkBatchCreateInput) {
    return tx.botBulkBatch.create({ data, select: BATCH_SELECT });
  }
  transition(tx: DbTx, batch: BulkBatchRow, data: Prisma.BotBulkBatchUpdateManyMutationInput) {
    return tx.botBulkBatch.updateMany({
      where: { id: batch.id, status: batch.status, cursor: batch.cursor, claimId: batch.claimId },
      data,
    });
  }
  counts(tx: DbTx, batchId: string) {
    return tx.$queryRaw<{ selectedCount: number; savedCount: number }[]>`
      SELECT count(*) FILTER (WHERE selected)::int AS "selectedCount",
        count(*) FILTER (WHERE saved_script_id IS NOT NULL)::int AS "savedCount"
      FROM bot_bulk_items WHERE batch_id = ${batchId}`;
  }
  items(tx: DbTx, batchId: string, query: BotBulkItemsQuery) {
    return tx.$queryRaw<BulkItemRow[]>(botBulkItemsSql(batchId, query));
  }
  recoverable(tx: DbTx, now: Date) {
    return tx.$queryRaw<{ id: string; cursor: number; attempts: number; nextAt: Date }[]>(
      botBulkRecoverySql(now),
    );
  }
  createItem(tx: DbTx, data: Prisma.BotBulkItemUncheckedCreateInput) {
    return tx.botBulkItem.create({ data, select: { id: true } });
  }
  selectionRows(tx: DbTx, batchId: string, ids: string[]) {
    return tx.botBulkItem.findMany({
      where: { batchId, id: { in: ids } },
      select: { id: true, savedScriptId: true },
    });
  }
  select(tx: DbTx, batchId: string, ids: string[], selected: boolean) {
    return tx.botBulkItem.updateMany({
      where: { batchId, id: { in: ids }, savedScriptId: null },
      data: { selected },
    });
  }
  selected(tx: DbTx, batchId: string) {
    return tx.botBulkItem.findMany({
      where: { batchId, selected: true, savedScriptId: null },
      orderBy: { ordinal: 'asc' },
      select: { id: true, topic: true, lines: true, lineHashes: true },
    });
  }
}
