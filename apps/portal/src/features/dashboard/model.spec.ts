import type { LiveMember } from '@opchub/shared/api-domains';
import { dashboardLive } from '@opchub/shared/mock-domains';
import { describe, expect, it } from 'vitest';
import {
  activePct,
  clockParts,
  countByStatus,
  filterMembers,
  lastInitial,
  liveAgo,
  longAgo,
  pageSlice,
  refreshIn,
} from './model';

const DOW_VI = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

const NOW = Date.parse('2026-10-16T09:00:00+07:00');
const members: LiveMember[] = dashboardLive(NOW).members;

describe('dashboard model', () => {
  it('đồng hồ hero theo giờ VN', () => {
    expect(clockParts(NOW, (d) => DOW_VI[d] ?? '')).toEqual({
      time: '09:00:00',
      date: 'Thứ Sáu, 16/10/2026',
    });
    expect(refreshIn(NOW)).toBe(5);
  });

  it('x giây/phút trước', () => {
    const iso = (ms: number) => new Date(NOW - ms).toISOString();
    expect(liveAgo(iso(2_000), NOW).key).toBe('now');
    expect(liveAgo(iso(41_000), NOW)).toEqual({ key: 'seconds', n: 41 });
    expect(liveAgo(iso(125_000), NOW)).toEqual({ key: 'minutes', n: 2 });
    expect(longAgo(iso(3 * 3_600_000), NOW)).toEqual({ key: 'hours', n: 3 });
    expect(longAgo(iso(30_000), NOW)).toEqual({ key: 'minutes', n: 1 });
  });

  it('đếm theo trạng thái như prototype (26 · 10 · 9 · 4 · 3) và tỉ lệ 88%', () => {
    expect(countByStatus(members)).toEqual({ all: 26, chat: 10, online: 9, event: 4, off: 3 });
    expect(activePct(members)).toBe(88);
  });

  it('lọc + phân trang: Đang chat 8/trang → 2 trang, trang lố bị kẹp', () => {
    const chat = filterMembers(members, 'chat');
    expect(chat).toHaveLength(10);
    expect(chat.every((m) => m.status === 'chat')).toBe(true);
    expect(pageSlice(chat, 1, 8).rows).toHaveLength(8);
    expect(pageSlice(chat, 9, 8)).toMatchObject({ page: 2 });
  });

  it('mới hoạt động trước', () => {
    expect(filterMembers(members, 'all')[0]?.name).toBe('Lê Minh Anh');
  });

  it('chữ cái đầu của từ cuối', () => {
    expect(lastInitial('Võ Ngọc Trâm')).toBe('T');
  });
});
