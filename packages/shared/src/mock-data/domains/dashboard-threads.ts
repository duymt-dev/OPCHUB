import type { LiveThread, Message } from '../../api-domains';
import { compareMockMessages } from './bot-message-store';
import { chatState } from './chat-store';
import { mockDb } from './store';

export interface MockThreadCursor {
  at: string;
  id: string;
}

/** Message-backed latest50, matching native opening/visibility/keyset semantics. */
export function mockDashboardThreads(before?: MockThreadCursor): LiveThread[] {
  const db = mockDb();
  const messages = [...db.messages.values()].flat();
  const rooms = new Map(db.rooms.filter((r) => r.isDefault).map((r) => [r.id, r]));
  const groups = new Map(db.groups.map((g) => [g.id, g]));
  const personas = new Map(db.personas.map((p) => [p.id, p]));
  const ext = chatState().ext;
  const candidates = messages
    .filter((message) => {
      const room = rooms.get(message.roomId);
      if (!room || !groups.has(room.groupId) || !message.isSimulated || message.hiddenAt)
        return false;
      if (!db.botMessageMeta.get(message.id)?.opening) return false;
      return !before || compareMockMessages(message, { createdAt: before.at, id: before.id }) < 0;
    })
    .sort((a, b) => compareMockMessages(b, a))
    .slice(0, 50);
  const author = (message: Message) => {
    const meta = db.botMessageMeta.get(message.id);
    const persona = meta ? personas.get(meta.personaId) : undefined;
    return {
      name: message.isSimulated ? (persona?.name ?? 'Thành viên') : message.sender.name,
      role: persona?.title ?? '',
      color: persona?.color ?? '#1677FF',
    };
  };
  return candidates.map((message) => {
    const meta = db.botMessageMeta.get(message.id);
    const room = rooms.get(message.roomId);
    const group = room ? groups.get(room.groupId) : undefined;
    const responses = messages
      .filter((other) => {
        if (other.id === message.id || other.hiddenAt) return false;
        const otherMeta = db.botMessageMeta.get(other.id);
        return (
          (other.roomId === message.roomId && otherMeta?.threadId === meta?.threadId) ||
          (otherMeta?.replyToId ?? ext.get(other.id)?.replyToId) === message.id
        );
      })
      .sort(compareMockMessages);
    const first = responses[0];
    return {
      id: message.id,
      groupId: group?.id ?? '',
      groupNames: group ? [group.name] : [],
      at: message.createdAt,
      author: author(message),
      body: message.body,
      reply: first ? { name: author(first).name, body: first.body } : null,
      replyCount: responses.length,
    };
  });
}
