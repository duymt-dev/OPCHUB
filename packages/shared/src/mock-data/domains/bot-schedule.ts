import { botScheduleSchema, type BotSchedulePatch } from '../../api-domains/bot-schedule';
import { botScheduleState } from '../../bot/schedule-window';
import { botState } from './bot-state';
import { ok, type MockResult } from './util';

export function mockBotSchedule(now = Date.now()) {
  const schedule = { ...botState().schedule };
  return { schedule, state: botScheduleState(schedule, new Date(now)) };
}
export function mockBotScheduleAllows(now: number): boolean {
  return mockBotSchedule(now).state === 'live';
}
export function patchMockBotSchedule(
  patch: BotSchedulePatch,
  now = Date.now(),
): MockResult<ReturnType<typeof mockBotSchedule>> {
  const parsed = botScheduleSchema.safeParse({ ...botState().schedule, ...patch });
  if (!parsed.success)
    return {
      ok: false,
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Lịch chạy không hợp lệ',
      fields: parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    };
  botState().schedule = parsed.data;
  return ok(mockBotSchedule(now));
}
