import { botTurnDelayMs } from '../../bot/runtime-time';
import {
  mockReplySource,
  pickMockReplyPersona,
  mockReplyCooldownAvailable,
} from './bot-reply-context';
import { reserveMockBotThread } from './bot-retention';
import { botState } from './bot-state';
import { mockDb, nextId } from './store';
import { iso } from './util';

/** Mock outbox admission: no synchronous publication and no reaction to persona posts. */
export function admitMockBotReply(
  messageId: string,
  now = Date.now(),
  random = () => 0,
): string | null {
  const db = mockDb();
  const state = botState();
  if (!state.featureEnabled || !db.botSettings.enabled || !db.botSettings.replyToMembers)
    return null;
  const source = mockReplySource(messageId);
  if (
    !source ||
    (state.stoppedAt !== null && Date.parse(source.message.createdAt) <= state.stoppedAt)
  )
    return null;
  const prior = state.replyTriggers.get(messageId);
  if (prior) return state.threads.some((row) => row.id === prior) ? prior : null;
  if ([...db.botMessageMeta.values()].some((meta) => meta.replyToId === messageId)) return null;
  if (state.activity.some((row) => row.id === `bot-reply-skip-${messageId}`)) return null;
  const roomId = source.room.id;
  if (
    state.threads.some(
      (row) => row.kind === 'reply' && row.replyRoomId === roomId && row.status !== 'done',
    )
  )
    return null;
  if (!mockReplyCooldownAvailable(roomId, now)) return null;
  const persona = pickMockReplyPersona(messageId, source.room.groupId, roomId, now, random);
  if (!persona) {
    state.activity.unshift({
      id: `bot-reply-skip-${messageId}`,
      text: 'Không có persona trong giờ để phản hồi',
      createdAt: iso(now),
    });
    return null;
  }
  const nextAt = now + botTurnDelayMs(0, random);
  if (!reserveMockBotThread()) return null;
  const id = nextId('reply');
  state.threads.unshift({
    id,
    scriptId: null,
    kind: 'reply',
    triggerMessageId: messageId,
    replyRoomId: roomId,
    status: 'scheduled',
    cursor: 0,
    createdAt: iso(now),
    nextAt,
    snapshot: {
      topic: source.message.body || 'Trao đổi trong nhóm',
      groupIds: [source.room.groupId],
      lines: [{ personaId: persona.id, body: '' }],
      delayMinutes: 0,
    },
  });
  state.replyTriggers.set(messageId, id);
  state.replyAdmissions.set(roomId, now);
  return id;
}
