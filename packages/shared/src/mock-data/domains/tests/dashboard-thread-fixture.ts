import type { Message } from '../../../api-domains';
import { recordMockBotMessage } from '../bot-message-store';
import type { MockBotMessageMeta } from '../bot-message-types';
import { botState } from '../bot-execution';
import { mockDb, resetMockDb } from '../store';

export const THREAD_TIME = '2026-10-21T05:00:00Z';
export function emptyBotHistory() {
  resetMockDb();
  const db = mockDb();
  db.messages.clear();
  db.botMessageMeta.clear();
  botState().threads = [];
  return db;
}

export function writeThreadMessage(
  id: string,
  threadId = id,
  turn = 0,
  options: Partial<Message> & {
    personaId?: string;
    kind?: MockBotMessageMeta['kind'];
    replyToId?: string;
  } = {},
) {
  const db = mockDb();
  const persona = db.personas[0];
  if (!persona) throw new Error('Missing fixture persona');
  const { personaId = persona.id, kind = 'script', replyToId, ...overrides } = options;
  const message: Message = {
    id,
    roomId: 'c1-general',
    body: `Content ${id}`,
    sender: { name: persona.name, avatarUrl: persona.avatarUrl },
    attachment: null,
    reactions: [],
    pinned: false,
    isSimulated: true,
    createdAt: THREAD_TIME,
    ...overrides,
  };
  const stored = recordMockBotMessage(db, message, {
    threadId,
    turn,
    personaId,
    kind,
    ...(replyToId ? { replyToId } : {}),
  });
  if (!stored) throw new Error(`Duplicate fixture ${id}`);
  return message;
}
