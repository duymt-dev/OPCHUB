const VN_OFFSET_MS = 7 * 3_600_000;
const DAY_MS = 86_400_000;

/** NA-08: all activity windows and daily quotas use the Vietnamese calendar. */
export function botDayStart(now: Date): Date {
  return new Date(Math.floor((now.getTime() + VN_OFFSET_MS) / DAY_MS) * DAY_MS - VN_OFFSET_MS);
}

function minuteOfDay(hour: string, minute: string, end: boolean): number | null {
  const h = Number(hour);
  const m = Number(minute);
  if (m > 59 || h > 24 || (h === 24 && (!end || m !== 0))) return null;
  return h * 60 + m;
}

/** Start inclusive/end exclusive; invalid persisted legacy text fails closed. */
export function isBotActiveHour(hours: string, now: Date): boolean {
  if (!Number.isFinite(now.getTime())) return false;
  const match = /^\s*(\d{1,2}):(\d{2})\s*[-–—]\s*(\d{1,2}):(\d{2})\s*$/.exec(hours);
  if (!match) return false;
  const [, fromHour, fromMinute, toHour, toMinute] = match;
  if (!fromHour || !fromMinute || !toHour || !toMinute) return false;
  const from = minuteOfDay(fromHour, fromMinute, false);
  const to = minuteOfDay(toHour, toMinute, true);
  if (from === null || to === null || from === to) return false;
  const vn = new Date(now.getTime() + VN_OFFSET_MS);
  const current = vn.getUTCHours() * 60 + vn.getUTCMinutes();
  return from < to ? current >= from && current < to : current >= from || current < to;
}

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
