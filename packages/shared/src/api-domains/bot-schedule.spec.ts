import { describe, expect, it } from 'vitest';
import { botSchedulePatchSchema, botScheduleSchema, DEFAULT_BOT_SCHEDULE } from './bot-schedule';

describe('D-112 bot schedule input', () => {
  it('accepts missing dates and independent partial pause updates', () => {
    expect(botScheduleSchema.parse(DEFAULT_BOT_SCHEDULE)).toEqual(DEFAULT_BOT_SCHEDULE);
    expect(botSchedulePatchSchema.parse({ paused: true })).toEqual({ paused: true });
    expect(botSchedulePatchSchema.parse({ fromDate: null, toDate: null })).toEqual({
      fromDate: null,
      toDate: null,
    });
  });
  it.each(['2026-02-29', '2026-04-31', '2026-13-01', '28/10/2026', '2026-10-28T00:00:00Z'])(
    'rejects invalid calendar date %s',
    (fromDate) => expect(botSchedulePatchSchema.safeParse({ fromDate }).success).toBe(false),
  );
  it('rejects reversed merged ranges at the end field', () => {
    const parsed = botScheduleSchema.safeParse({
      fromDate: '2026-10-29',
      toDate: '2026-10-28',
      paused: false,
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.issues[0]?.path).toEqual(['toDate']);
  });
  it('rejects unknown controls and coerced booleans', () => {
    expect(botSchedulePatchSchema.safeParse({ enabled: true }).success).toBe(false);
    expect(botSchedulePatchSchema.safeParse({ paused: 'false' }).success).toBe(false);
  });
});
