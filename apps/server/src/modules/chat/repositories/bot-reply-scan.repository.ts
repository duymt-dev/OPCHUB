import { Injectable } from '@nestjs/common';
import { Prisma, type DbTx } from '@opchub/db';
import { botReplySettingsSchema } from '@opchub/shared/api-domains';

export interface BotReplyScanRow {
  groupId: string;
  groupName: string;
  roomId: string;
  messageIds: string[];
  pending: number;
}

interface ReplyHistoryRow {
  id: string;
  groupId: string;
  groupName: string;
  roomId: string;
  replyToId: string;
  personaName: string;
  body: string;
  createdAt: Date;
}

export function botReplyHistorySql() {
  return Prisma.sql`
    SELECT m.id, r.group_id AS "groupId", g.name AS "groupName", m.room_id AS "roomId",
      m.reply_to_id AS "replyToId", COALESCE(p.name, '') AS "personaName", m.body,
      m.created_at AS "createdAt"
    FROM (
      SELECT id FROM messages WHERE is_simulated AND reply_to_id IS NOT NULL
      ORDER BY created_at DESC, id DESC LIMIT 100
    ) recent
    JOIN messages m ON m.id = recent.id
    JOIN rooms r ON r.id = m.room_id
    JOIN groups g ON g.id = r.group_id
    LEFT JOIN personas p ON p.id = m.persona_id
    ORDER BY m.created_at DESC, m.id DESC`;
}

/** D-112: first take the latest N IDs, THEN filter eligibility; never fetch N older matches. */
export function botReplyScanSql(sampleSize: number) {
  const size = botReplySettingsSchema.shape.sampleSize.parse(sampleSize);
  return Prisma.sql`
    SELECT g.id AS "groupId", g.name AS "groupName", r.id AS "roomId",
      eligible.ids AS "messageIds", eligible.pending
    FROM groups g
    JOIN rooms r ON r.group_id = g.id AND r.is_default AND r.deleted_at IS NULL
    CROSS JOIN LATERAL (
      SELECT array_agg(m.id ORDER BY m.created_at, m.id) AS ids, count(*)::int AS pending
      FROM (
        SELECT id FROM messages WHERE room_id = r.id
        ORDER BY created_at DESC, id DESC LIMIT ${size}
      ) recent
      JOIN messages m ON m.id = recent.id
      WHERE m.kind = 'text' AND m.sender_id IS NOT NULL AND NOT m.is_simulated
        AND m.hidden_at IS NULL AND m.deleted_at IS NULL AND m.body <> ''
        AND NOT EXISTS (
          SELECT 1 FROM messages answer WHERE answer.reply_to_id = m.id AND answer.is_simulated
        )
    ) eligible
    WHERE g.deleted_at IS NULL AND eligible.pending > 0
    ORDER BY eligible.pending DESC, g.id`;
}

@Injectable()
export class BotReplyScanRepository {
  history(db: DbTx) {
    return db.$queryRaw<ReplyHistoryRow[]>(botReplyHistorySql());
  }
  scan(db: DbTx, sampleSize: number) {
    return db.$queryRaw<BotReplyScanRow[]>(botReplyScanSql(sampleSize));
  }

  previews(db: DbTx, ids: string[]) {
    return db.message.findMany({
      where: { id: { in: ids } },
      select: { id: true, body: true, createdAt: true, sender: { select: { fullName: true } } },
    });
  }
}
