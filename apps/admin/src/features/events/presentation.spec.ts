import { describe, expect, it } from 'vitest';
import { eventDay, eventTime } from './presentation';
import { vnDateOf, vnToIso } from './model';

describe('D-141 AC824-08 event display is separate from canonical inputs', () => {
  const event = Object.freeze({
    startsAt: '2026-12-31T17:00:00Z',
    day: 'T6, 01/01',
    time: '00:00 – 01:30',
    endTime: '01:30',
  });

  it('retains original Vietnamese labels and never mutates the DTO', () => {
    const before = JSON.stringify(event);
    expect(eventDay(event.startsAt, event.day, 'vi')).toBe(event.day);
    expect(eventTime(event, 'vi')).toBe(event.time);
    expect(eventDay(event.startsAt, event.day, 'en')).toContain('Fri');
    expect(eventTime(event, 'en')).toBe('00:00 – 01:30');
    expect(JSON.stringify(event)).toBe(before);
    expect(vnDateOf(event.startsAt)).toBe('2027-01-01');
    expect(vnToIso('2027-01-01', '00:00')).toBe('2026-12-31T17:00:00.000Z');
  });

  it.each(['en', 'en-SG', 'zh', 'id', 'th', 'ms', 'ms-BN', 'fil', 'km', 'lo', 'my'])(
    'uses VN day/time rather than UTC or host timezone in %s',
    (locale) => {
      expect(eventDay(event.startsAt, event.day, locale)).not.toContain('T6');
      expect(eventTime(event, locale)).not.toContain('17:00');
      expect(eventTime({ ...event, endTime: null }, locale)).not.toContain(' – ');
    },
  );

  it('keeps unknown source labels in vi and handles invalid/absent timestamps without guessing', () => {
    expect(eventDay(null, 'custom source label', 'vi')).toBe('custom source label');
    expect(eventDay(null, 'custom source label', 'en')).toBe('—');
    expect(eventTime({ ...event, startsAt: 'bad' }, 'en')).toBe('—');
    expect(eventTime({ ...event, startsAt: '2026-12-31T17:00' }, 'en')).toBe('—');
  });
});
