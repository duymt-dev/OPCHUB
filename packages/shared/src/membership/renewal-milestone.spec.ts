import { describe, expect, it } from 'vitest';
import { DEFAULT_RENEWAL } from '../api-domains/renewal';
import { nextRenewalMilestone, renewalDaysLeft, renewalMilestoneOf } from './renewal-milestone';

describe('REQ-620 BR-471 renewal milestones', () => {
  const enabled = DEFAULT_RENEWAL.milestones;
  it.each([
    [31, null],
    [30, 'D30'],
    [8, 'D30'],
    [7, 'D7'],
    [2, 'D7'],
    [1, 'D1'],
    [0, null],
    [-3, null],
  ])('window %i -> %s', (d, expected) => expect(nextRenewalMilestone(d, enabled)).toBe(expected));
  it('REQ-204 no replay or fallback; disabled milestone does not catch up to D30', () => {
    const until = new Date('2026-12-30T17:00:00Z');
    const now = new Date('2026-12-24T01:00:00Z');
    expect(renewalDaysLeft(until, now)).toBe(7);
    expect(renewalMilestoneOf(until, now, enabled, new Set(['D7']))).toBeNull();
    expect(renewalMilestoneOf(until, now, { ...enabled, d7: false })).toBeNull();
    expect(renewalMilestoneOf(until, new Date('2026-12-26T01:00:00Z'), enabled)).toBe('D7');
  });
  it('uses VN calendar boundaries rather than elapsed 24h', () => {
    expect(
      renewalDaysLeft(new Date('2026-12-30T17:00:00Z'), new Date('2026-12-30T16:59:00Z')),
    ).toBe(1);
  });
});
