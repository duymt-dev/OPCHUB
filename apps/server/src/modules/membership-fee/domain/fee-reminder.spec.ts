import { describe, expect, it } from 'vitest';
import { daysLeft, dueMilestone } from './fee-reminder';

const DAY = 86_400_000;
/** 08:00 giờ VN ngày 19/10/2026 */
const NOW = new Date('2026-10-19T01:00:00Z');
const inDays = (d: number) => new Date(NOW.getTime() + d * DAY);

describe('mốc nhắc phí (NA-04, D-57)', () => {
  it('REQ-204 chọn mốc muộn nhất chưa gửi', () => {
    expect(dueMilestone(inDays(31), NOW)).toBeNull();
    expect(dueMilestone(inDays(30), NOW)).toBe('T-30');
    expect(dueMilestone(inDays(30), NOW, new Set(['T-30']))).toBeNull();
    expect(dueMilestone(inDays(7), NOW, new Set(['T-30']))).toBe('T-7');
    // job nghỉ 2 ngày: d nhảy 8 → 6 vẫn nhận T-7 một lần
    expect(dueMilestone(inDays(6), NOW, new Set(['T-30']))).toBe('T-7');
    expect(dueMilestone(inDays(6), NOW, new Set(['T-30', 'T-7']))).toBeNull();
    // chưa nhận T-30 nhưng đã tới T-7 → chỉ T-7, không gửi dồn
    expect(dueMilestone(inDays(5), NOW)).toBe('T-7');
    expect(dueMilestone(inDays(0), NOW, new Set(['T-30', 'T-7']))).toBe('T-0');
    expect(dueMilestone(inDays(-3), NOW, new Set(['T-0']))).toBe('T+3');
    expect(dueMilestone(inDays(-2), NOW, new Set(['T-0']))).toBeNull();
  });

  it('REQ-204 ranh giới ngày theo giờ VN (23:30 VN vs 00:30 VN)', () => {
    const until = new Date('2026-10-25T17:30:00Z'); // 00:30 VN 26/10
    expect(daysLeft(until, new Date('2026-10-18T16:30:00Z'))).toBe(8); // 23:30 VN 18/10
    expect(daysLeft(until, new Date('2026-10-18T17:30:00Z'))).toBe(7); // 00:30 VN 19/10
    expect(dueMilestone(until, new Date('2026-10-18T16:30:00Z'), new Set(['T-30']))).toBeNull();
    expect(dueMilestone(until, new Date('2026-10-18T17:30:00Z'), new Set(['T-30']))).toBe('T-7');
  });

  it('REQ-204 quá 10 ngày không nhắc', () => {
    expect(dueMilestone(inDays(-10), NOW)).toBe('T+3');
    expect(dueMilestone(inDays(-11), NOW)).toBeNull();
  });
});
