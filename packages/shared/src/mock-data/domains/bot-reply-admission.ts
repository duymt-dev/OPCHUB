import { botReplyDelayMs } from '../../bot/reply-timing';
import { mockReplySource, pickMockReplyPersona } from './bot-reply-context';
import { reserveMockBotThread } from './bot-retention';
import { botState } from './bot-state';
import { mockDb, nextId } from './store';
import { iso } from './util';
import { mockBotScheduleAllows } from './bot-schedule';

/** Mock outbox admission: no synchronous publication and no reaction to persona posts. */
export function admitMockBotReply(
  messageId: string,
  now = Date.now(),
  random = () => 0,
  options: { manual?: boolean; dueNow?: boolean } = {},
): string | null {
  const db = mockDb();
  const state = botState();
  if (
    !state.featureEnabled ||
    !db.botSettings.enabled ||
    (!db.botSettings.replyToMembers && !options.manual) ||
    !mockBotScheduleAllows(now)
  )
    return null;
  const source = mockReplySource(messageId);
  if (
    !source ||
    (state.stoppedAt !== null && Date.parse(source.message.createdAt) <= state.stoppedAt)
  )
    return null;
  if ([...db.botMessageMeta.values()].some((meta) => meta.replyToId === messageId)) return null;
  const prior = state.threads.find((row) => row.id === state.replyTriggers.get(messageId));
  if (prior && prior.status !== 'done') return prior.id;
  const roomId = source.room.id;
  if (
    state.threads.some(
      (row) => row.kind === 'reply' && row.replyRoomId === roomId && row.status !== 'done',
    )
  )
    return null;
  const persona = pickMockReplyPersona(messageId, source.room.groupId, roomId, random);
  if (!persona) {
    if (!state.activity.some((row) => row.id === `bot-reply-skip-${messageId}`))
      state.activity.unshift({
        id: `bot-reply-skip-${messageId}`,
        text: 'Không có persona đang bật trong nhóm để phản hồi',
        createdAt: iso(now),
      });
    return null;
  }
  const nextAt = now + (options.dueNow ? 0 : botReplyDelayMs(state.replies.control.delaySeconds));
  if (!reserveMockBotThread()) return null;
  if (prior) state.threads = state.threads.filter((row) => row.id !== prior.id);
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
