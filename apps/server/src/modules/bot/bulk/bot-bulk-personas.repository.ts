import { Injectable } from '@nestjs/common';
import { Prisma, type DbTx } from '@opchub/db';
import type { BulkPersona } from '@opchub/shared';

/** At most eight profiles after ID-only member/fallback seeks, never a full catalog JSON load. */
export function botBulkPersonasSql(groupIds: readonly string[]) {
  return Prisma.sql`
    WITH preferred AS MATERIALIZED (
      SELECT id FROM personas WHERE enabled AND group_ids && ${[...groupIds]}::text[] ORDER BY id LIMIT 8
    ), pool AS (
      SELECT id, 0 AS priority FROM preferred
      UNION ALL
      SELECT id, 1 AS priority FROM (
        SELECT id FROM personas WHERE enabled AND id NOT IN (SELECT id FROM preferred) ORDER BY id LIMIT 8
      ) fallback
    )
    SELECT p.id, p.name, p.tone, p.bio, p.skills, p.group_ids AS "groupIds", p.enabled
    FROM (SELECT id, priority FROM pool ORDER BY priority, id LIMIT 8) picked
    JOIN personas p ON p.id = picked.id ORDER BY picked.priority, picked.id`;
}

@Injectable()
export class BotBulkPersonasRepository {
  candidates(tx: DbTx, groupIds: readonly string[]) {
    return tx.$queryRaw<BulkPersona[]>(botBulkPersonasSql(groupIds));
  }
}
