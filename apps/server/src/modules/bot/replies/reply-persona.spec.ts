import { describe, expect, it } from 'vitest';
import { pickEnabledReplyPersona } from './reply-persona';

describe('D-112 reply persona policy', () => {
  const people = [
    { id: 'a', enabled: true, groupIds: ['g'] },
    { id: 'b', enabled: true, groupIds: ['g'] },
  ];
  it('prefers addressed persona then a recent speaker', () => {
    expect(pickEnabledReplyPersona(people, 'g', ['a'], 'b')).toBe('b');
    expect(pickEnabledReplyPersona(people, 'g', ['b'], null)).toBe('b');
  });
  it('never falls back outside the group or to a disabled persona', () => {
    expect(pickEnabledReplyPersona(people, 'other', [], 'a')).toBeNull();
    expect(
      pickEnabledReplyPersona(
        people.map((p) => ({ ...p, enabled: false })),
        'g',
        [],
        'a',
      ),
    ).toBeNull();
  });
  it('does not consult hours or exhausted daily quota', () => {
    const exhausted = {
      ...people[0],
      id: 'a',
      enabled: true,
      groupIds: ['g'],
      activeHours: '00:00 - 01:00',
      remaining: 0,
    };
    expect(pickEnabledReplyPersona([exhausted], 'g', [], null)).toBe('a');
    expect(pickEnabledReplyPersona(people, 'g', [], null, () => 1)).toBe('b');
  });
});
