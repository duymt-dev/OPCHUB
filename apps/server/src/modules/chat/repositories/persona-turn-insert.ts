import { Prisma } from '@opchub/db';
import type { botMessageContextSchema } from '@opchub/shared/api-domains';
import type { z } from 'zod';

interface TurnInsert {
  personaId: string;
  body: string;
  clientMsgId: string;
  at: Date;
  replyToId?: string;
}

export function personaTurnInsertSql(
  roomIds: string[],
  input: TurnInsert,
  context?: z.output<typeof botMessageContextSchema>,
) {
  return Prisma.sql`
    INSERT INTO messages (id, room_id, persona_id, is_simulated, kind, body,
      client_msg_id, reply_to_id, created_at, updated_at, bot_thread_id, bot_turn, bot_kind, bot_opening)
    SELECT gen_random_uuid()::text, x.id, ${input.personaId}, true, 'text', ${input.body},
      ${input.clientMsgId}, ${input.replyToId ?? null}, ${input.at}, ${input.at},
      ${context?.threadId ?? null}, ${context?.turn ?? null}, ${context?.kind ?? null},
      (${context?.threadId ?? null}::text IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM messages previous
        WHERE previous.room_id = x.id AND previous.bot_thread_id = ${context?.threadId ?? null}
          AND previous.bot_opening
      ))
    FROM unnest(${roomIds}::text[]) AS x(id)
    ON CONFLICT DO NOTHING RETURNING id, room_id AS "roomId"`;
}
