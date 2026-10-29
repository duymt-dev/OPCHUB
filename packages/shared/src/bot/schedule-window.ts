import {
  botScheduleSchema,
  type BotSchedule,
  type BotScheduleState,
} from '../api-domains/bot-schedule';

/** Fail closed for corrupted persisted state or an invalid clock. */
export function botScheduleState(schedule: BotSchedule, now: Date): BotScheduleState {
  if (!botScheduleSchema.safeParse(schedule).success || !Number.isFinite(now.getTime()))
    return 'paused';
  if (schedule.paused) return 'paused';
  const vnDate = new Date(now.getTime() + 7 * 3_600_000).toISOString().slice(0, 10);
  if (schedule.fromDate && vnDate < schedule.fromDate) return 'waiting';
  if (schedule.toDate && vnDate > schedule.toDate) return 'ended';
  return 'live';
}
