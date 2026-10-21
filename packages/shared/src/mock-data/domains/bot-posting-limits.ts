import { botDayStart } from '../../bot/runtime-time';
import { botState } from './bot-state';
import { mockDb } from './store';

export const mockPersonaDayKey = (personaId: string, now: number) =>
  `${personaId}:${new Date(now + 7 * 3600000).toISOString().slice(0, 10)}`;

/** Publication metadata survives display pruning, like native soft-deleted rows. */
export function mockPersonaDailyCount(personaId: string, now: number): number {
  const start = botDayStart(new Date(now)).getTime();
  const stored = [...mockDb().botMessageMeta.values()].filter((meta) => {
    const at = Date.parse(meta.createdAt);
    return meta.personaId === personaId && at >= start && at < start + 86400000;
  }).length;
  return Math.max(stored, botState().daily.get(mockPersonaDayKey(personaId, now)) ?? 0);
}

/** Shared per-group30/min gate for all kinds; no reservation until all targets pass. */
export function mockGroupBotRate(groupId: string, now: number): number[] | null {
  const db = mockDb();
  const rate = (botState().groupRate.get(groupId) ?? []).filter(
    (at) => at > now - 60000 && at <= now,
  );
  const rooms = new Set(db.rooms.filter((row) => row.groupId === groupId).map((row) => row.id));
  const stored = [...db.botMessageMeta.values()].filter((meta) => {
    const at = Date.parse(meta.createdAt);
    return rooms.has(meta.roomId) && at > now - 60000 && at <= now;
  }).length;
  return Math.max(rate.length, stored) >= 30 ? null : rate;
}
