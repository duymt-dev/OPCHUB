import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { Prisma, type DbTx } from '@opchub/db';
import { normalizeBotBulkLine } from '@opchub/shared';

/** Stable sorted set matches the database's immutable expression exactly. */
export function botBulkLineHashes(lines: readonly string[]): string[] {
  return [
    ...new Set(
      lines
        .map(normalizeBotBulkLine)
        .filter(Boolean)
        .map((line) => createHash('sha256').update(line, 'utf8').digest('hex')),
    ),
  ].sort();
}

export function botSavedLineCollisionSql(hashes: readonly string[]) {
  // A 4000-hash overlap literal is estimated as nearly universal and scans wide script JSON.
  // One set-based query instead performs parameterized single-hash GIN probes, stopping at a hit.
  return Prisma.sql`SELECT EXISTS (
    SELECT 1 FROM unnest(${[...hashes]}::text[]) AS wanted(hash)
    CROSS JOIN LATERAL (
      SELECT 1 FROM bot_scripts WHERE bot_script_line_hashes(lines) && ARRAY[wanted.hash] LIMIT 1
    ) AS matched
  ) AS collision`;
}

export function botBatchLineCollisionSql(batchId: string, hashes: readonly string[]) {
  return Prisma.sql`SELECT EXISTS (
    SELECT 1 FROM bot_bulk_items WHERE batch_id = ${batchId} AND line_hashes && ${[...hashes]}::text[]
  ) AS collision`;
}

@Injectable()
export class BotBulkLinesRepository {
  async savedCollision(tx: DbTx, hashes: readonly string[]): Promise<boolean> {
    if (!hashes.length) return false;
    const rows = await tx.$queryRaw<{ collision: boolean }[]>(botSavedLineCollisionSql(hashes));
    return rows[0]?.collision ?? false;
  }

  async batchCollision(tx: DbTx, batchId: string, hashes: readonly string[]): Promise<boolean> {
    if (!hashes.length) return false;
    const rows = await tx.$queryRaw<{ collision: boolean }[]>(
      botBatchLineCollisionSql(batchId, hashes),
    );
    return rows[0]?.collision ?? false;
  }
}
