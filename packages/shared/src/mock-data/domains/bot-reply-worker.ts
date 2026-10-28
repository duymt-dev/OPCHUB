import { botState } from './bot-state';
import {
  eligibleMockReplyPersonas,
  mockPersonaDailyCount,
  mockReplySource,
  mockGroupReplyRate,
} from './bot-reply-context';
import { publishMockBotMessage } from './bot-publication';
import { chatState } from './chat-store';
import { mockDb } from './store';
import { recordMockBotActivity } from './bot-activity';
import { iso } from './util';
import type { ThreadRec } from './bot-state-types';
import { mockFakeBotTurn } from './bot-fake-turn';
import { mockBotScheduleAllows } from './bot-schedule';

function finish(rec: ThreadRec, now: number, posted: boolean) {
  rec.cursor = 1;
  rec.status = 'done';
  rec.nextAt = null;
  recordMockBotActivity(
    posted
      ? `Đã đăng lượt 1/1: ${rec.snapshot.topic}`
      : 'Bỏ lượt 1: Tin gốc hoặc persona không còn hợp lệ',
    posted ? 1 : 0,
    now,
  );
}

/** One synchronous due turn; recheck flags, source, persona and quotas at publication. */
export function advanceMockReplies(now = Date.now()): void {
  const db = mockDb();
  const state = botState();
  if (
    !state.featureEnabled ||
    !db.botSettings.enabled ||
    !db.botSettings.replyToMembers ||
    !mockBotScheduleAllows(now)
  )
    return;
  for (const rec of state.threads) {
    if (rec.kind !== 'reply' || rec.status === 'done' || rec.nextAt === null || rec.nextAt > now)
      continue;
    const source = rec.triggerMessageId ? mockReplySource(rec.triggerMessageId) : null;
    const line = rec.snapshot.lines[0];
    const persona = source
      ? eligibleMockReplyPersonas(source.room.groupId, now).find((p) => p.id === line?.personaId)
      : null;
    const answered = [...db.botMessageMeta.values()].some(
      (meta) => meta.replyToId === rec.triggerMessageId,
    );
    if (!source || source.room.id !== rec.replyRoomId || !persona || !line || answered) {
      finish(rec, now, false);
      continue;
    }
    const rate = mockGroupReplyRate(source.room.groupId, now);
    if (!rate) continue;
    const dailyBefore = mockPersonaDailyCount(persona.id, now);
    line.body = mockFakeBotTurn(rec.snapshot.topic);
    const message = {
      id: `bot-${rec.id}-0-${source.room.id}`,
      roomId: source.room.id,
      sender: { name: persona.name, avatarUrl: persona.avatarUrl },
      body: line.body,
      attachment: null,
      reactions: [],
      pinned: false,
      isSimulated: true,
      createdAt: iso(now),
    };
    const stored = publishMockBotMessage(message, {
      threadId: rec.id,
      kind: 'reply',
      turn: 0,
      personaId: persona.id,
      replyToId: source.message.id,
    });
    if (stored) {
      state.groupRate.set(source.room.groupId, [...rate, now]);
      state.replyPosted.set(source.room.id, now);
      const key = `${persona.id}:${new Date(now + 7 * 3600000).toISOString().slice(0, 10)}`;
      state.daily.set(key, dailyBefore + 1);
      persona.postCount += 1;
      chatState().ext.set(message.id, {
        kind: 'text',
        senderId: null,
        clientMsgId: null,
        reportedBy: new Set(),
        replyToId: source.message.id,
        replyTo: { name: source.message.sender.name, text: source.message.body },
      });
    }
    finish(rec, now, stored);
  }
}
