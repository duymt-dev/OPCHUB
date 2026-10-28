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

  it('D-112 null/past timestamps rotate while future timestamps remain fenced', () => {
    const now = new Date('2026-10-21T05:00:00Z');
    expect(isBotScriptDue(null, now)).toBe(true);
    expect(isBotScriptDue(new Date('2026-10-21T05:00:01Z'), now)).toBe(false);
    expect(isBotScriptDue(new Date('2026-10-21T04:59:00Z'), now)).toBe(true);
    expect(isBotScriptDue(now, now)).toBe(true);
  });

  it('D-112 repeated eligibility does not consume the date; invalid dates fail closed', () => {
    const now = new Date('2026-10-21T05:00:00Z');
    expect(isBotScriptDue(now, now)).toBe(true);
    expect(isBotScriptDue(now, new Date(now.getTime() + 1000))).toBe(true);
    expect(isBotScriptDue(new Date('bad'), now)).toBe(false);
    expect(isBotScriptDue(null, new Date('bad'))).toBe(false);
  });
});
