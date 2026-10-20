import { describe, expect, it } from 'vitest';
import { botTurnDelayMs, isBotScriptDue } from './schedule';

describe('REQ-208 NA-08 scheduling', () => {
  it.each([0, 0.25, 0.5, 1])('REQ-208 random sample %s keeps delay inside 30s–5m', (sample) => {
    const delay = botTurnDelayMs(0, () => sample);
    expect(delay).toBeGreaterThanOrEqual(30_000);
    expect(delay).toBeLessThanOrEqual(300_000);
  });

  it('REQ-208 configured minimum is respected below the five-minute cap', () => {
    expect(botTurnDelayMs(2, () => 0)).toBe(120_000);
    expect(botTurnDelayMs(2, () => 1)).toBe(300_000);
    expect(botTurnDelayMs(2, () => 0.5)).toBe(210_000);
  });

  it.each([5, 10, 120])(
    'REQ-208 legacy %s minute setting cannot exceed the turn cap',
    (minutes) => {
      expect(botTurnDelayMs(minutes, () => 0.5)).toBe(300_000);
    },
  );

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
    'REQ-208 rejects invalid configured delay %s',
    (delay) => {
      expect(() => botTurnDelayMs(delay)).toThrow(RangeError);
    },
  );

  it.each([-0.1, 1.1, Number.NaN])('REQ-208 rejects invalid injected randomness %s', (sample) => {
    expect(() => botTurnDelayMs(1, () => sample)).toThrow(RangeError);
  });

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
