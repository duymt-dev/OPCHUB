import type { LiveMember } from '@opchub/shared/api-domains';
import type { LiveFilter } from './types';
import { fmtInt } from '@/i18n/format';

/** Logic thuần của Dashboard — tách khỏi component để test */

const VN_TZ = 'Asia/Ho_Chi_Minh';

export const fmtNumber = fmtInt;

export type AgoKey = 'now' | 'seconds' | 'minutes' | 'hours' | 'days';

/** "x giây/phút trước" của khối LIVE (dưới 5 giây = vừa xong) */
export function liveAgo(at: string, now: number): { key: AgoKey; n: number } {
  const s = Math.max(0, Math.floor((now - Date.parse(at)) / 1000));
  if (s < 5) return { key: 'now', n: 0 };
  if (s < 60) return { key: 'seconds', n: s };
  return { key: 'minutes', n: Math.floor(s / 60) };
}

/** "x phút/giờ/ngày trước" của thông báo và thảo luận (tối thiểu 1 phút) */
export function longAgo(at: string, now: number): { key: AgoKey; n: number } {
  const s = Math.max(0, (now - Date.parse(at)) / 1000);
  if (s < 3600) return { key: 'minutes', n: Math.max(1, Math.floor(s / 60)) };
  if (s < 86400) return { key: 'hours', n: Math.floor(s / 3600) };
  return { key: 'days', n: Math.floor(s / 86400) };
}

/** Đồng hồ hero: "09:00:00" + "Thứ Sáu, 16/10/2026" theo giờ Việt Nam; `dowName(0..6)` = tên thứ đã dịch (D-65) */
export function clockParts(
  now: number,
  dowName: (dow: number) => string,
): { time: string; date: string } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: VN_TZ,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
  }).formatToParts(new Date(now));
  const get = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value ?? '';
  const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return {
    time: `${get('hour')}:${get('minute')}:${get('second')}`,
    date: `${dow >= 0 ? dowName(dow) : ''}, ${get('day')}/${get('month')}/${get('year')}`,
  };
}

/** Giây còn lại tới lượt làm mới (chu kỳ 5 giây) */
export const refreshIn = (now: number) => 5 - (Math.floor(now / 1000) % 5);

/** Mới hoạt động trước; lọc theo trạng thái */
export function filterMembers(members: LiveMember[], filter: LiveFilter): LiveMember[] {
  const sorted = [...members].sort(
    (a, b) => Date.parse(b.lastActiveAt) - Date.parse(a.lastActiveAt),
  );
  return filter === 'all' ? sorted : sorted.filter((m) => m.status === filter);
}

export function countByStatus(members: LiveMember[]): Record<LiveFilter, number> {
  const out: Record<LiveFilter, number> = {
    all: members.length,
    chat: 0,
    online: 0,
    event: 0,
    off: 0,
  };
  for (const m of members) out[m.status] += 1;
  return out;
}

/** Trang hợp lệ + lát cắt */
export function pageSlice<T>(rows: T[], page: number, size: number) {
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const p = Math.min(Math.max(1, page), pages);
  return { page: p, rows: rows.slice((p - 1) * size, p * size) };
}

/** Thời điểm hoạt động gần nhất trong cả danh sách */
export const latestActivity = (members: LiveMember[]) =>
  members.reduce(
    (a, m) => (m.lastActiveAt > a ? m.lastActiveAt : a),
    members[0]?.lastActiveAt ?? '',
  );

/** % thành viên không ngoại tuyến */
export const activePct = (members: LiveMember[]) =>
  members.length
    ? Math.round(
        ((members.length - members.filter((m) => m.status === 'off').length) / members.length) *
          100,
      )
    : 0;

/** Chữ cái đầu của từ cuối ("Võ Ngọc Trâm" → "T") */
export const lastInitial = (name: string) => (name.split(' ').pop() ?? '?').charAt(0).toUpperCase();
