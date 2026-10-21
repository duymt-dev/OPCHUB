import type { Message } from '../../api-domains';
import { botMessageContextSchema } from '../../api-domains';
import type { MockBotMessageMeta } from './bot-message-types';
import type { MockDb } from './store-types';

export type WriteContext = Omit<MockBotMessageMeta, 'roomId' | 'opening' | 'createdAt'>;

/** Same execution-turn uniqueness and first-successful-room identity as native. */
export function recordMockBotMessage(db: MockDb, message: Message, context: WriteContext): boolean {
  const parsed = botMessageContextSchema.parse(context);
  const prior = [...db.botMessageMeta.values()].filter(
    (entry) => entry.roomId === message.roomId && entry.threadId === parsed.threadId,
  );
  if (prior.some((entry) => entry.turn === parsed.turn)) return false;
  if (
    db.botMessageMeta.has(message.id) ||
    [...db.messages.values()].some((rows) => rows.some((row) => row.id === message.id))
  )
    return false;
  db.botMessageMeta.set(message.id, {
    ...parsed,
    roomId: message.roomId,
    createdAt: message.createdAt,
    personaId: context.personaId,
    opening: !prior.some((entry) => entry.opening),
    ...(context.replyToId ? { replyToId: context.replyToId } : {}),
  });
  const rows = [...(db.messages.get(message.roomId) ?? []), message].sort(compareMockMessages);
  const simulated = rows.filter((row) => row.isSimulated).slice(-120);
  const keep = new Set(simulated.map((row) => row.id));
  db.messages.set(
    message.roomId,
    rows.filter((row) => !row.isSimulated || keep.has(row.id)),
  );
  return true;
}

/** Ascending native (created_at,id) order, independent of locale and insertion order. */
export function compareMockMessages(
  a: Pick<Message, 'createdAt' | 'id'>,
  b: Pick<Message, 'createdAt' | 'id'>,
): number {
  const delta = Date.parse(a.createdAt) - Date.parse(b.createdAt);
  return delta || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}
