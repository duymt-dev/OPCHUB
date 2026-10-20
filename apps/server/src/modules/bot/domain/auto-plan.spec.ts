import { describe, expect, it } from 'vitest';
import { nextAutoTopic, planAutoPersonas, type AutoPersona } from './auto-plan';

const now = new Date('2026-10-21T05:00:00Z');
const persona = (id: string, patch: Partial<AutoPersona> = {}): AutoPersona => ({
  id,
  enabled: true,
  groupIds: ['c1'],
  activeHours: '8:00 - 22:00',
  remaining: 4,
  ...patch,
});

describe('REQ-208 automatic conversation planning', () => {
  it('plans an opener, a distinct member, and the opener closing without copying text', () => {
    expect(planAutoPersonas([persona('p1'), persona('p2')], 'c1', now, () => 0)).toEqual([
      'p1',
      'p2',
      'p1',
    ]);
  });
  it('includes an eligible third member before the closing turn', () => {
    expect(
      planAutoPersonas([persona('p1'), persona('p2'), persona('p3')], 'c1', now, () => 1),
    ).toEqual(['p3', 'p2', 'p1', 'p3']);
  });
  it.each([
    { enabled: false },
    { groupIds: ['c2'] },
    { activeHours: '01:00 - 02:00' },
    { remaining: 0 },
  ])('does not plan an ineligible participant: %j', (patch) => {
    expect(planAutoPersonas([persona('p1'), persona('p2', patch)], 'c1', now)).toEqual([]);
  });
  it('requires enough durable daily budget for the repeated opener', () => {
    expect(
      planAutoPersonas(
        [persona('p1', { remaining: 1 }), persona('p2', { remaining: 1 })],
        'c1',
        now,
      ),
    ).toEqual([]);
    expect(
      planAutoPersonas([persona('p1', { remaining: 1 }), persona('p2')], 'c1', now, () => 0),
    ).toEqual(['p2', 'p1', 'p2']);
  });
  it('cycles configured topics and tolerates an edited/deleted previous topic', () => {
    expect(nextAutoTopic([' one ', 'two'], undefined)).toBe('one');
    expect(nextAutoTopic(['one', 'two'], 'one')).toBe('two');
    expect(nextAutoTopic(['one', 'two'], 'two')).toBe('one');
    expect(nextAutoTopic(['one', 'two'], 'removed')).toBe('one');
    expect(nextAutoTopic([' ', ''], undefined)).toBeNull();
  });
});
