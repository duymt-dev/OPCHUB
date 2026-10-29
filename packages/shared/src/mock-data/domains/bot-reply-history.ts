import type { Message } from '../../api-domains';
import { botState } from './bot-state';
import { mockDb } from './store';
import { compareMockMessages } from './bot-message-store';

/** Separate bounded history survives the30-thread /120-message display collections. */
export function recordMockReplyHistory(message: Message, personaId: string, replyToId: string) {
  const db = mockDb();
  const room = db.rooms.find((row) => row.id === message.roomId);
  if (!room) return;
  const state = botState().replies;
  state.history = [
    ...state.history.filter((row) => row.id !== message.id),
    {
      id: message.id,
      groupId: room.groupId,
      groupName: db.groups.find((row) => row.id === room.groupId)?.name ?? '',
      roomId: room.id,
      replyToId,
      personaId,
      personaName: message.sender.name,
      body: message.body,
      createdAt: message.createdAt,
    },
  ]
    .sort((a, b) => compareMockMessages(b, a))
    .slice(0, 100);
}

export function mockReplyHistory() {
  const db = mockDb();
  const groups = new Map(db.groups.map((row) => [row.id, row.name]));
  const personas = new Map(db.personas.map((row) => [row.id, row.name]));
  return botState().replies.history.flatMap(({ personaId, ...row }) => {
    const groupName = groups.get(row.groupId);
    return groupName === undefined
      ? []
      : [{ ...row, groupName, personaName: personas.get(personaId) ?? '' }];
  });
}
