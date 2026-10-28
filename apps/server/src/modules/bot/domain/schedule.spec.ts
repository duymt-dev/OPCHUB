import { describe, expect, it } from 'vitest';
import { botTurnDelayMs, isBotScriptDue } from './schedule';

describe('REQ-208 NA-08 scheduling', () => {
  it.each([1, 2, 5, 6, 15, 60])(
    'D-112 honors exactly %s minutes without a five-minute cap',
    (minutes) => {
      expect(botTurnDelayMs(minutes)).toBe(minutes * 60_000);
    },
  );
  it.each([0, -1, 1.5, 61, 120, Number.NaN, Number.POSITIVE_INFINITY])(
    'D-112 rejects unsupported minute spacing %s',
    (minutes) => {
      expect(() => botTurnDelayMs(minutes)).toThrow(RangeError);
    },
  );

  it('REQ-208 manual-only scripts and future schedules are not due', () => {
    const now = new Date('2026-10-21T05:00:00Z');
    expect(isBotScriptDue(null, null, now)).toBe(false);
    expect(isBotScriptDue(new Date('2026-10-21T05:00:01Z'), null, now)).toBe(false);
  });

  it('REQ-208 scheduled timestamp is consumed once; an explicitly newer schedule can run', () => {
    const now = new Date('2026-10-21T05:00:00Z');
    const earlier = new Date('2026-10-21T04:59:00Z');
    expect(isBotScriptDue(earlier, null, now)).toBe(true);
    expect(isBotScriptDue(now, null, now)).toBe(true);
    expect(isBotScriptDue(earlier, now, now)).toBe(false);
    expect(isBotScriptDue(earlier, earlier, now)).toBe(false);
    expect(isBotScriptDue(now, earlier, now)).toBe(true);
  });
});
