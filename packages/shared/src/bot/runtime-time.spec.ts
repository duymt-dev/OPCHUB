import { describe, expect, it } from 'vitest';
import { isBotActiveHour } from './runtime-time';

describe('REQ-208 UAT-14 canonical all-day activity option', () => {
  it.each([
    '2026-10-20T17:00:00.000Z',
    '2026-10-21T00:00:00.000Z',
    '2026-10-21T05:00:00.000Z',
    '2026-10-21T16:59:59.999Z',
    '2026-10-21T17:00:00.000Z',
  ])('UI all-day choice is active at Vietnamese boundary %s', (instant) => {
    expect(isBotActiveHour('Cả ngày', new Date(instant))).toBe(true);
  });
  it('trims surrounding form whitespace, but invalid dates still fail closed', () => {
    expect(isBotActiveHour(' Cả ngày ', new Date('2026-10-21T05:00:00Z'))).toBe(true);
    expect(isBotActiveHour('Cả ngày', new Date('invalid'))).toBe(false);
  });
  it.each(['Cả ngày!', 'Cả', 'nonsense', '', 'all day'])(
    'unknown text remains inactive: %s',
    (text) => {
      expect(isBotActiveHour(text, new Date('2026-10-21T05:00:00Z'))).toBe(false);
    },
  );
});
