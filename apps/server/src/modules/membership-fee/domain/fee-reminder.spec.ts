import { describe, expect, it } from 'vitest';
import { daysLeft, dueMilestone } from './fee-reminder';
const NOW = new Date('2026-10-19T01:00:00Z');
const inDays = (d: number) => new Date(NOW.getTime() + d * 86_400_000);
describe('REQ-204 REQ-620 BR-471 renewal policy', () => {
  it('latest current window without replay or catch-up bursts', () => {
    expect(dueMilestone(inDays(31), NOW)).toBeNull();
    expect(dueMilestone(inDays(30), NOW)).toBe('D30');
    expect(dueMilestone(inDays(7), NOW, new Set(['D30']))).toBe('D7');
    expect(dueMilestone(inDays(6), NOW, new Set(['D7']))).toBeNull();
    expect(dueMilestone(inDays(1), NOW, new Set(['D7']))).toBe('D1');
  });
  it('VN calendar boundary', () => {
    const until = new Date('2026-10-25T17:30:00Z');
    expect(daysLeft(until, new Date('2026-10-18T16:30:00Z'))).toBe(8);
    expect(daysLeft(until, new Date('2026-10-18T17:30:00Z'))).toBe(7);
  });
  it('BR-471 no automatic day-zero or post-expiry reminder', () => {
    for (const d of [0, -1, -3, -10, -11]) expect(dueMilestone(inDays(d), NOW)).toBeNull();
  });
  it('disabled D7 does not fall back to D30', () => {
    expect(dueMilestone(inDays(7), NOW, new Set(), { d30: true, d7: false, d1: true })).toBeNull();
  });
});
