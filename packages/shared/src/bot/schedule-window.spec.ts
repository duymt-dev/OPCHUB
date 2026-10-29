import { describe, expect, it } from 'vitest';
import { DEFAULT_BOT_SCHEDULE } from '../api-domains/bot-schedule';
import { botScheduleState } from './schedule-window';

describe('D-112 Vietnam calendar scheduling', () => {
  const schedule = { fromDate: '2026-10-28', toDate: '2026-10-29', paused: false };
  it.each([
    ['2026-10-27T16:59:59.999Z', 'waiting'],
    ['2026-10-27T17:00:00.000Z', 'live'],
    ['2026-10-29T16:59:59.999Z', 'live'],
    ['2026-10-29T17:00:00.000Z', 'ended'],
  ])('evaluates %s as %s', (now, state) => {
    expect(botScheduleState(schedule, new Date(now))).toBe(state);
  });
  it('manual pause has priority over every date state', () => {
    for (const now of ['2026-01-01', '2026-10-28', '2027-01-01'])
      expect(botScheduleState({ ...schedule, paused: true }, new Date(now))).toBe('paused');
  });
  it('allows open start/end and defaults to continuous operation', () => {
    const now = new Date('2026-10-28T12:00:00Z');
    expect(botScheduleState(DEFAULT_BOT_SCHEDULE, now)).toBe('live');
    expect(botScheduleState({ ...schedule, fromDate: null }, now)).toBe('live');
    expect(botScheduleState({ ...schedule, toDate: null }, now)).toBe('live');
  });
  it('fails closed for corrupt stored data or clock', () => {
    expect(botScheduleState({ ...schedule, fromDate: 'invalid' }, new Date())).toBe('paused');
    expect(botScheduleState(schedule, new Date('invalid'))).toBe('paused');
  });
});
