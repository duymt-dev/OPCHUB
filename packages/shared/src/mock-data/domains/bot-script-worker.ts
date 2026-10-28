import type { Persona } from '../../api-domains';
import { botTurnDelayMs, isBotActiveHour } from '../../bot/runtime-time';
import { recordMockBotActivity } from './bot-activity';
import { mockGroupBotRate, mockPersonaDailyCount, mockPersonaDayKey } from './bot-posting-limits';
import { publishMockBotMessage } from './bot-publication';
import { botState } from './bot-state';
import type { ThreadRec } from './bot-state-types';
import { mockDb } from './store';
import { iso } from './util';
import { mockFakeBotTurn } from './bot-fake-turn';
import { mockBotScheduleAllows } from './bot-schedule';

function publishLine(
  rec: ThreadRec,
  persona: Persona,
  body: string,
  rooms: { id: string; groupId: string }[],
  now: number,
): number | null {
  const state = botState();
  const rates = new Map<string, number[]>();
  for (const room of rooms) {
    const rate = mockGroupBotRate(room.groupId, now);
    if (!rate) return null;
    rates.set(room.groupId, rate);
  }
  const before = mockPersonaDailyCount(persona.id, now);
  let count = 0;
  for (const room of rooms) {
    const stored = publishMockBotMessage(
      {
        id: `bot-${rec.id}-${rec.cursor}-${room.id}`,
        roomId: room.id,
        sender: { name: persona.name, avatarUrl: persona.avatarUrl },
        body,
        attachment: null,
        reactions: [],
        pinned: false,
        isSimulated: true,
        createdAt: iso(now),
      },
      { threadId: rec.id, turn: rec.cursor, kind: rec.kind ?? 'script', personaId: persona.id },
    );
    if (stored) {
      count += 1;
      state.groupRate.set(room.groupId, [...(rates.get(room.groupId) ?? []), now]);
    }
  }
  state.daily.set(mockPersonaDayKey(persona.id, now), before + count);
  persona.postCount += count;
  return count;
}

/** Returns without advancing on pause/burst denial, as native transaction rollback does. */
export function advanceMockScriptTurn(rec: ThreadRec, now: number): void {
  if (!mockBotScheduleAllows(now)) return;
  const db = mockDb();
  const script = db.scripts.find((row) => row.id === rec.scriptId);
  if (rec.kind !== 'auto' && !script?.enabled) return;
  const line = rec.snapshot.lines[rec.cursor];
  const persona = db.personas.find((row) => row.id === line?.personaId);
  let count = 0;
  let reason = 'Không có lượt hợp lệ';
  if (line) {
    reason = 'Persona đã tắt, bị xóa hoặc ngoài khung giờ';
    if (persona?.enabled && isBotActiveHour(persona.activeHours, new Date(now))) {
      const rooms = db.rooms.filter(
        (room) =>
          room.isDefault &&
          rec.snapshot.groupIds.includes(room.groupId) &&
          persona.groupIds.includes(room.groupId) &&
          db.groups.some((g) => g.id === room.groupId),
      );
      reason = 'Persona không có nhóm hợp lệ hoặc đã đạt tần suất ngày';
      if (
        rooms.length &&
        mockPersonaDailyCount(persona.id, now) + rooms.length <= persona.postsPerDay
      ) {
        if (rec.kind === 'auto' && !line.body) line.body = mockFakeBotTurn(rec.snapshot.topic);
        const posted = publishLine(rec, persona, line.body, rooms, now);
        if (posted === null) return;
        count = posted;
      }
    }
  }
  rec.cursor += 1;
  rec.status = rec.cursor >= rec.snapshot.lines.length ? 'done' : 'running';
  rec.nextAt =
    rec.status === 'done'
      ? null
      : now + botTurnDelayMs(script?.delayMinutes ?? db.botSettings.delayMinutes);
  recordMockBotActivity(
    count
      ? `Đã đăng lượt ${rec.cursor}/${rec.snapshot.lines.length}: ${rec.snapshot.topic}`
      : `Bỏ lượt ${rec.cursor}: ${reason}`,
    count,
    now,
  );
  const log = db.botLog.find((row) => row.id === rec.id);
  if (log) log.status = rec.status;
}
