import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { sendMessageSchema } from '@opchub/shared/api-domains';
import { parseClean } from '@/common/html/sanitize-input';
import { OutboxService } from '@/common/outbox';
import { personaTurnPruneSql } from '../repositories/persona-turn-prune';

export interface PersonaTurnInput {
  personaId: string;
  groupIds: readonly string[];
  clientMsgId: string;
  body: string;
  at: Date;
  replyToId?: string;
}

export interface WrittenPersonaTurn {
  id: string;
  roomId: string;
}

/** TIP-501/502: caller commits cursor/state, messages and publication outbox together. */
@Injectable()
export class PersonaTurnWriter {
  constructor(private readonly outbox: OutboxService) {}

  async write(tx: DbTx, input: PersonaTurnInput): Promise<WrittenPersonaTurn[]> {
    const clean = parseClean(sendMessageSchema, {
      clientMsgId: input.clientMsgId,
      body: input.body,
      kind: 'text',
    });
    if (!input.groupIds.length) return [];
    await tx.$queryRaw`SELECT id FROM personas WHERE id = ${input.personaId} FOR UPDATE`;
    if (input.replyToId) {
      const target = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM messages WHERE id = ${input.replyToId}
          AND deleted_at IS NULL AND hidden_at IS NULL FOR UPDATE`;
      if (!target.length) return [];
    }
    // Stable lock order serializes overlapping rooms and keeps cap/count checks linearizable.
    const rooms = await tx.$queryRaw<{ id: string }[]>`
      SELECT r.id FROM rooms r JOIN personas p ON p.id = ${input.personaId}
      WHERE r.group_id = ANY(${[...input.groupIds]}::text[]) AND r.is_default
        AND p.enabled AND r.group_id = ANY(p.group_ids)
        AND (${input.replyToId ?? null}::text IS NULL OR EXISTS (
          SELECT 1 FROM messages m WHERE m.id = ${input.replyToId ?? null}
            AND m.room_id = r.id AND m.deleted_at IS NULL AND m.hidden_at IS NULL
        ))
      ORDER BY r.id FOR UPDATE OF r`;
    if (!rooms.length) return [];
    const created = await tx.$queryRaw<WrittenPersonaTurn[]>`
      INSERT INTO messages (id, room_id, persona_id, is_simulated, kind, body,
        client_msg_id, reply_to_id, created_at, updated_at)
      SELECT gen_random_uuid()::text, x.id, ${input.personaId}, true, 'text', ${clean.body},
        ${clean.clientMsgId}, ${input.replyToId ?? null}, ${input.at}, ${input.at}
      FROM unnest(${rooms.map((r) => r.id)}::text[]) AS x(id)
      ON CONFLICT DO NOTHING
      RETURNING id, room_id AS "roomId"`;
    if (!created.length) return [];
    await tx.persona.update({
      where: { id: input.personaId },
      data: { postCount: { increment: created.length } },
      select: { id: true },
    });
    await this.prune(
      tx,
      created.map((row) => row.roomId),
      input.at,
    );
    await this.outbox.addMany(
      tx,
      'bot.turn_posted',
      created.map((row) => ({ messageId: row.id })),
    );
    return created;
  }

  private prune(tx: DbTx, roomIds: string[], at: Date): Promise<number> {
    // Existing partial covering index: messages_simulated_room_idx(room_id, created_at DESC, id DESC).
    // IDs only before the PK update; never scan/delete real-member messages.
    return tx.$executeRaw(personaTurnPruneSql(roomIds, at));
  }
}
