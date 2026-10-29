interface ReplyPersona {
  id: string;
  enabled: boolean;
  groupIds: string[];
}

/** D-112 replaces activity-hour, daily-quota and cooldown eligibility for replies only. */
export function pickEnabledReplyPersona(
  candidates: readonly ReplyPersona[],
  groupId: string,
  recent: readonly string[],
  addressed: string | null,
  random = Math.random,
): string | null {
  const eligible = candidates.filter((p) => p.enabled && p.groupIds.includes(groupId));
  const direct = eligible.find((p) => p.id === addressed);
  if (direct) return direct.id;
  const speakers = eligible.filter((p) => recent.includes(p.id));
  const pool = speakers.length ? speakers : eligible;
  if (!pool.length) return null;
  const sample = random();
  if (!Number.isFinite(sample) || sample < 0 || sample > 1)
    throw new RangeError('Invalid reply sample');
  return pool[Math.min(pool.length - 1, Math.floor(sample * pool.length))]?.id ?? null;
}
