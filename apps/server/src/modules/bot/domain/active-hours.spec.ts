import { describe, expect, it } from 'vitest';
import { botDayStart, isBotActiveHour } from './active-hours';

describe('REQ-208 NA-08 Vietnamese activity hours', () => {
  it.each([
    ['2026-10-21T00:59:59Z', false],
    ['2026-10-21T01:00:00Z', true],
    ['2026-10-21T14:59:59Z', true],
    ['2026-10-21T15:00:00Z', false],
    ['2026-10-21T23:00:00Z', false],
  ])('REQ-208 default 8:00–22:00 uses VN time at %s', (iso, active) => {
    expect(isBotActiveHour('8:00 – 22:00', new Date(iso))).toBe(active);
  });

  it.each(['8:00 - 22:00', '08:00–22:00', ' 08:00 — 22:00 '])(
    'REQ-208 parses stored separator variants: %s',
    (hours) => expect(isBotActiveHour(hours, new Date('2026-10-21T05:00:00Z'))).toBe(true),
  );

  it('REQ-208 overnight window includes either side of Vietnamese midnight', () => {
    expect(isBotActiveHour('22:00 – 02:00', new Date('2026-10-21T16:00:00Z'))).toBe(true);
    expect(isBotActiveHour('22:00 – 02:00', new Date('2026-10-21T18:00:00Z'))).toBe(true);
    expect(isBotActiveHour('22:00 – 02:00', new Date('2026-10-21T19:00:00Z'))).toBe(false);
    expect(isBotActiveHour('22:00 – 02:00', new Date('2026-10-21T05:00:00Z'))).toBe(false);
  });

  it('REQ-208 explicit 00:00–24:00 covers the full day', () => {
    expect(isBotActiveHour('00:00 – 24:00', new Date('2026-10-21T16:59:59Z'))).toBe(true);
    expect(isBotActiveHour('00:00 – 24:00', new Date('2026-10-21T17:00:00Z'))).toBe(true);
  });

  it.each([
    '',
    'nonsense',
    '25:00 - 26:00',
    '08:60 - 22:00',
    '24:00 - 02:00',
    '8:00 - 24:01',
    '8:00 - 8:00',
  ])('REQ-208 invalid legacy hours fail closed: %s', (hours) =>
    expect(isBotActiveHour(hours, new Date('2026-10-21T05:00:00Z'))).toBe(false),
  );

  it('REQ-208 invalid date cannot activate a persona', () => {
    expect(isBotActiveHour('8:00 - 22:00', new Date('invalid'))).toBe(false);
  });

  it('REQ-208 daily quota boundary is Vietnamese midnight, independent of host timezone', () => {
    expect(botDayStart(new Date('2026-10-21T16:59:59Z')).toISOString()).toBe(
      '2026-10-20T17:00:00.000Z',
    );
    expect(botDayStart(new Date('2026-10-21T17:00:00Z')).toISOString()).toBe(
      '2026-10-21T17:00:00.000Z',
    );
  });
});
