import { chatState, type ChatState } from '../chat-store';
import { mockDb } from '../store';
import { chatSnapshotSchema, type ChatSnapshot } from './chat-schema';

export function captureChatSnapshot(): ChatSnapshot {
  const db = mockDb();
  const chat = chatState();
  return chatSnapshotSchema.parse({
    messages: [...db.messages],
    botMessageMeta: [...db.botMessageMeta],
    ext: [...chat.ext].map(([id, value]) => [id, { ...value, reportedBy: [...value.reportedBy] }]),
    topics: [...chat.topics],
    pins: [...chat.pins],
    unread: [...chat.unread].map(([id, rows]) => [id, [...rows]]),
  });
}

export function restoreChatSnapshot(input: unknown): void {
  const data = chatSnapshotSchema.parse(input);
  const db = mockDb();
  db.messages = new Map(data.messages);
  db.botMessageMeta = new Map(
    data.botMessageMeta.map(([id, { replyToId, ...value }]) => [
      id,
      { ...value, ...(replyToId === undefined ? {} : { replyToId }) },
    ]),
  );
  const restored: ChatState = {
    ext: new Map(
      data.ext.map(([id, { replyToId, ...value }]) => [
        id,
        {
          ...value,
          reportedBy: new Set(value.reportedBy),
          ...(replyToId === undefined ? {} : { replyToId }),
        },
      ]),
    ),
    topics: new Map(data.topics),
    pins: new Map(data.pins),
    unread: new Map(data.unread.map(([id, rows]) => [id, new Map(rows)])),
  };
  Object.assign(chatState(), restored);
}
