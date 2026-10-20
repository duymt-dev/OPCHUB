import { botDayStart, isBotActiveHour } from '../../bot/runtime-time';
import { chatState, findChatMessage } from './chat-store';
import { botState } from './bot-state';
import { mockDb } from './store';
import { compareMockMessages } from './bot-message-store';

export function mockReplySource(messageId: string) {
  const db = mockDb();
  const message = findChatMessage(messageId);
  if (
    !message ||
    message.isSimulated ||
    message.hiddenAt ||
    !chatState().ext.get(messageId)?.senderId
  )
    return null;
  const room = db.rooms.find((row) => row.id === message.roomId && row.isDefault);
  if (!room || !db.groups.some((row) => row.id === room.groupId)) return null;
  return { message, room };
}

export function mockPersonaDailyCount(personaId: string, now: number): number {
  const db = mockDb();
  const start = botDayStart(new Date(now)).getTime();
  const key = `${personaId}:${new Date(now + 7 * 3600000).toISOString().slice(0, 10)}`;
  const stored = [...db.messages.values()].flat().filter((message) => {
    const at = Date.parse(message.createdAt);
    return (
      db.botMessageMeta.get(message.id)?.personaId === personaId &&
      at >= start &&
      at < start + 86400000
    );
  }).length;
  return Math.max(stored, botState().daily.get(key) ?? 0);
}

export function eligibleMockReplyPersonas(groupId: string, now: number) {
  return mockDb()
    .personas.filter(
      (persona) =>
        persona.enabled &&
        persona.groupIds.includes(groupId) &&
        isBotActiveHour(persona.activeHours, new Date(now)) &&
        mockPersonaDailyCount(persona.id, now) < persona.postsPerDay,
    )
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

export function pickMockReplyPersona(
  messageId: string,
  groupId: string,
  roomId: string,
  now: number,
  random: () => number,
) {
  const db = mockDb();
  const eligible = eligibleMockReplyPersonas(groupId, now);
  const quoteId = chatState().ext.get(messageId)?.replyToId;
  const quoted = quoteId ? findChatMessage(quoteId) : null;
  const addressed =
    quoted && !quoted.hiddenAt && quoted.roomId === roomId
      ? db.botMessageMeta.get(quoted.id)?.personaId
      : undefined;
  const direct = eligible.find((row) => row.id === addressed);
  if (direct) return direct;
  const recent = new Set(
    (db.messages.get(roomId) ?? [])
      .filter((row) => !row.hiddenAt)
      .sort(compareMockMessages)
      .slice(-10)
      .map((row) => db.botMessageMeta.get(row.id)?.personaId),
  );
  const speakers = eligible.filter((persona) => recent.has(persona.id));
  const pool = speakers.length ? speakers : eligible;
  if (!pool.length) return null;
  const sample = random();
  if (!Number.isFinite(sample) || sample < 0 || sample > 1)
    throw new Error('Invalid reply random sample');
  return pool[Math.min(pool.length - 1, Math.floor(sample * pool.length))] ?? null;
}

export function mockReplyCooldownAvailable(roomId: string, now: number) {
  const db = mockDb();
  const state = botState();
  const posted = [...db.messages.values()]
    .flat()
    .filter((row) => {
      const meta = db.botMessageMeta.get(row.id);
      return row.roomId === roomId && !!meta?.replyToId;
    })
    .map((row) => Date.parse(row.createdAt));
  const latest = Math.max(
    state.replyAdmissions.get(roomId) ?? 0,
    state.replyPosted.get(roomId) ?? 0,
    ...posted,
  );
  return !latest || now - latest >= 120000;
}

export function mockGroupReplyRate(groupId: string, now: number): number[] | null {
  const db = mockDb();
  const rate = (botState().groupRate.get(groupId) ?? []).filter((at) => at > now - 60000);
  const rooms = new Set(db.rooms.filter((row) => row.groupId === groupId).map((row) => row.id));
  const stored = [...db.messages.values()]
    .flat()
    .filter(
      (row) =>
        rooms.has(row.roomId) &&
        row.isSimulated &&
        Date.parse(row.createdAt) > now - 60000 &&
        Date.parse(row.createdAt) <= now,
    ).length;
  return Math.max(rate.length, stored) >= 30 ? null : rate;
}
