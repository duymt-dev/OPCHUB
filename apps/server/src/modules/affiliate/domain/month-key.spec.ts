import { describe, expect, it } from 'vitest';
import { isPastMonth, monthKey, vnDay } from './month-key';

describe('tháng theo giờ VN (D-53)', () => {
  it('D-53 month_key giờ VN: 23:30 30/09 → 2026-09, 00:30 01/10 → 2026-10', () => {
    expect(monthKey(new Date('2026-09-30T16:30:00Z'))).toBe('2026-09');
    expect(monthKey(new Date('2026-09-30T17:30:00Z'))).toBe('2026-10');
  });

  it('D-53 ngày VN cho lượt nhấp', () => {
    expect(vnDay(new Date('2026-10-19T18:00:00Z')).toISOString()).toBe('2026-10-20T00:00:00.000Z');
  });

  it('REQ-309 chỉ tháng đã kết thúc mới chi trả', () => {
    const now = new Date('2026-10-20T03:00:00Z');
    expect(isPastMonth('2026-09', now)).toBe(true);
    expect(isPastMonth('2026-10', now)).toBe(false);
  });
});
