import { describe, expect, it } from 'vitest';
import { endedAt, inDaysVn, inRemindWindow, vnStartOfDay } from './event-sweep';

const H = 3_600_000;
/** 08:00 VN 19/10/2026 */
const NOW = new Date('2026-10-19T01:00:00Z');

describe('scheduler sự kiện (NA-23)', () => {
  it('REQ-223 cửa sổ nhắc 24h', () => {
    expect(inRemindWindow(new Date(NOW.getTime() + 23 * H), NOW)).toBe(true);
    expect(inRemindWindow(new Date(NOW.getTime() + 24 * H), NOW)).toBe(true);
    expect(inRemindWindow(new Date(NOW.getTime() + 25 * H), NOW)).toBe(false);
    expect(inRemindWindow(new Date(NOW.getTime() - H), NOW)).toBe(false);
  });

  it('REQ-342 inDays theo ngày VN', () => {
    // 23:30 VN cùng ngày → Hôm nay; 00:30 VN hôm sau → Ngày mai
    expect(inDaysVn(new Date('2026-10-19T16:30:00Z'), NOW)).toBe(0);
    expect(inDaysVn(new Date('2026-10-19T17:30:00Z'), NOW)).toBe(1);
    expect(inDaysVn(new Date('2026-10-22T12:30:00Z'), NOW)).toBe(3);
    expect(vnStartOfDay(NOW).toISOString()).toBe('2026-10-18T17:00:00.000Z');
  });

  it('REQ-223 thiếu giờ kết thúc → coi như 2 giờ', () => {
    const s = new Date('2026-10-20T12:00:00Z');
    expect(endedAt(s, null).toISOString()).toBe('2026-10-20T14:00:00.000Z');
    expect(endedAt(s, new Date('2026-10-20T15:00:00Z')).toISOString()).toBe(
      '2026-10-20T15:00:00.000Z',
    );
  });
});
