export const BOT_TICK_MS = 10_000;
export const BOT_MIN_TURN_DELAY_MS = 30_000;
export const BOT_MAX_TURN_DELAY_MS = 300_000;

/** TIP-501: respect the configured minimum without exceeding the five-minute cap. */
export function botTurnDelayMs(delayMinutes: number, random: () => number = Math.random): number {
  if (!Number.isFinite(delayMinutes) || delayMinutes < 0) {
    throw new RangeError('Invalid bot delay');
  }
  const sample = random();
  if (!Number.isFinite(sample) || sample < 0 || sample > 1) {
    throw new RangeError('Invalid bot random sample');
  }
  const minimum = Math.max(
    BOT_MIN_TURN_DELAY_MS,
    Math.min(BOT_MAX_TURN_DELAY_MS, delayMinutes * 60_000),
  );
  return minimum + Math.floor(sample * (BOT_MAX_TURN_DELAY_MS - minimum));
}

/** Only explicitly scheduled scripts run from tick; null remains manual-only. */
export function isBotScriptDue(runAt: Date | null, lastRunAt: Date | null, now: Date): boolean {
  return (
    runAt !== null &&
    Number.isFinite(now.getTime()) &&
    runAt.getTime() <= now.getTime() &&
    (lastRunAt === null || lastRunAt.getTime() < runAt.getTime())
  );
}
