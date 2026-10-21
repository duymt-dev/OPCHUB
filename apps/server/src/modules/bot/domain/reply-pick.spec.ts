import { describe, expect, it } from 'vitest';
import type { AutoPersona } from './auto-plan';
import { pickReplyPersona } from './reply-pick';

const now = new Date('2026-10-21T05:00:00Z');
const persona = (id: string, patch: Partial<AutoPersona> = {}): AutoPersona => ({
  id,
  enabled: true,
  groupIds: ['c1'],
  activeHours: '8:00 - 22:00',
  remaining: 1,
  ...patch,
});
describe('UAT-14 REQ-411 reply persona selection', () => {
  it('prefers a directly addressed eligible persona over a recent speaker', () => {
    expect(pickReplyPersona([persona('a'), persona('b')], 'c1', now, ['a'], 'b', () => 0)).toBe(
      'b',
    );
  });
  it('prefers an eligible recent speaker over an unrelated candidate', () => {
    expect(pickReplyPersona([persona('a'), persona('b')], 'c1', now, ['b'], null, () => 0)).toBe(
      'b',
    );
  });
  it.each([
    { enabled: false },
    { groupIds: ['c2'] },
    { activeHours: '01:00 - 02:00' },
    { remaining: 0 },
  ])(
    'does not select a disabled/unassigned/out-of-hours/exhausted persona even if addressed: %j',
    (patch) => {
      expect(pickReplyPersona([persona('a', patch)], 'c1', now, ['a'], 'a')).toBeNull();
    },
  );
  it('falls back to the remaining eligible candidate when the addressed persona is unavailable', () => {
    expect(
      pickReplyPersona([persona('a', { enabled: false }), persona('b')], 'c1', now, ['a'], 'a'),
    ).toBe('b');
  });
  it('handles both endpoints of the random sample without an out-of-range pick', () => {
    const pool = [persona('a'), persona('b')];
    expect(pickReplyPersona(pool, 'c1', now, [], null, () => 0)).toBe('a');
    expect(pickReplyPersona(pool, 'c1', now, [], null, () => 1)).toBe('b');
  });
});
