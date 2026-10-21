import { Injectable } from '@nestjs/common';
import { Prisma, type DbTx } from '@opchub/db';

interface HiddenBatch {
  hidden: number;
  roomIds: string[];
  messageIds: string[];
}

@Injectable()
export class PersonaHideRepository {
  async hide(tx: DbTx, at: Date, groupIds?: string[]): Promise<HiddenBatch> {
    // One UPDATE; no wide message payload or unbounded array of message IDs is returned.
    const rows = await tx.$queryRaw<HiddenBatch[]>(hidePersonaSql(at, groupIds));
    return rows[0] ?? { hidden: 0, roomIds: [], messageIds: [] };
  }
}

export function hidePersonaSql(at: Date, groupIds?: string[]) {
  const scope = groupIds
    ? Prisma.sql`AND m.room_id IN (SELECT id FROM rooms WHERE group_id = ANY(${groupIds}::text[]))`
    : Prisma.empty;
  return Prisma.sql`
      WITH hidden AS (
        UPDATE messages m SET hidden_at = ${at}, updated_at = ${at}
        WHERE m.is_simulated AND m.hidden_at IS NULL ${scope}
        RETURNING m.id, m.room_id
      )
      SELECT (SELECT count(*)::integer FROM hidden) AS hidden,
        ARRAY(SELECT DISTINCT room_id FROM hidden) AS "roomIds",
        ARRAY(SELECT id FROM hidden LIMIT 201) AS "messageIds"`;
}
