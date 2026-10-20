import { isBotActiveHour } from './active-hours';
import type { AutoPersona } from './auto-plan';

/** UAT-14: prefer the directly addressed persona, then recent speakers, never ineligible ones. */
export function pickReplyPersona(
  candidates: readonly AutoPersona[],
  groupId: string,
  now: Date,
  recent: readonly string[],
  addressed: string | null,
  random = Math.random,
): string | null {
  const eligible = candidates.filter(
    (p) =>
      p.enabled &&
      p.groupIds.includes(groupId) &&
      p.remaining > 0 &&
      isBotActiveHour(p.activeHours, now),
  );
  const direct = eligible.find((p) => p.id === addressed);
  if (direct) return direct.id;
  const speakers = eligible.filter((p) => recent.includes(p.id));
  const pool = speakers.length ? speakers : eligible;
  if (!pool.length) return null;
  const sample = random();
  if (!Number.isFinite(sample) || sample < 0 || sample > 1)
    throw new Error('Invalid reply random sample');
  return pool[Math.min(pool.length - 1, Math.floor(sample * pool.length))]?.id ?? null;
}
