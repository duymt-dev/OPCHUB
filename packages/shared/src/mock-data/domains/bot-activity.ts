import { botDayStart } from '../../bot/runtime-time';
import { botState } from './bot-state';
import { nextId } from './store';
import { iso } from './util';

/** Native activity aggregate is calendar-day based, independent of visible message retention. */
export function mockBotTodayCount(now: number): number {
  const state = botState();
  const start = botDayStart(new Date(now)).getTime();
  state.todayCount = state.activity.reduce(
    (sum, row) =>
      sum + (Date.parse(row.createdAt) >= start ? (state.activityMessages.get(row.id) ?? 0) : 0),
    0,
  );
  return state.todayCount;
}

export function recordMockBotActivity(text: string, count: number, now: number): void {
  const state = botState();
  const id = nextId('act');
  state.activity.unshift({ id, text, createdAt: iso(now) });
  state.activityMessages.set(id, count);
  mockBotTodayCount(now);
}
