import { isBotActiveHour } from './active-hours';

export interface AutoPersona {
  readonly id: string;
  readonly enabled: boolean;
  readonly groupIds: readonly string[];
  readonly activeHours: string;
  readonly remaining: number;
}

/** Prototype conversation shape: opener, another member, optional third, opener closes.
 * Only plan IDs here. Text is generated per due turn through the LLM adapter.
 */
export function planAutoPersonas(
  candidates: readonly AutoPersona[],
  groupId: string,
  now: Date,
  random: () => number = Math.random,
): string[] {
  const eligible = candidates.filter(
    (p) =>
      p.enabled &&
      p.groupIds.includes(groupId) &&
      p.remaining >= 1 &&
      isBotActiveHour(p.activeHours, now),
  );
  if (eligible.length < 2) return [];
  const openers = eligible.filter((p) => p.remaining >= 2);
  if (!openers.length) return [];
  const first = pick(openers, random);
  const others = eligible.filter((p) => p.id !== first.id);
  const second = pick(others, random);
  const thirdPool = others.filter((p) => p.id !== second.id);
  return [first.id, second.id, ...(thirdPool.length ? [pick(thirdPool, random).id] : []), first.id];
}

function pick<T>(values: readonly T[], random: () => number): T {
  const sample = random();
  if (!Number.isFinite(sample) || sample < 0 || sample > 1)
    throw new Error('Invalid bot random sample');
  const result = values[Math.min(values.length - 1, Math.floor(sample * values.length))];
  if (!result) throw new Error('Empty bot selection');
  return result;
}

export function nextAutoTopic(
  topics: readonly string[],
  previous: string | undefined,
): string | null {
  const valid = topics.map((topic) => topic.trim()).filter(Boolean);
  if (!valid.length) return null;
  return valid[(previous ? valid.indexOf(previous) + 1 : 0) % valid.length] ?? null;
}
