import type { PublicStats } from '../../api';
import { members } from '../../fixtures';
import { mockDb } from './store';
import { isoFromVnDate, MOCK_NOW } from './util';

const VN_OFFSET_MS = 7 * 3_600_000;
const YEAR_MS = 365 * 86_400_000;

/**
 * `GET /public/stats` (MSW, CR-15): tính từ CSDL giả như server — thành viên còn hoạt động,
 * nhóm, mới từ đầu tháng (giờ VN), sự kiện 12 tháng gần nhất. Online MSW không có presence →
 * số người có trạng thái hoạt động (cố định theo store, không ngẫu nhiên).
 */
export function publicStats(now: number = MOCK_NOW): PublicStats {
  const db = mockDb();
  const active = members.filter((m) => (db.userStatus.get(m.id) ?? 'active') === 'active');
  const v = new Date(now + VN_OFFSET_MS);
  const monthStart = Date.UTC(v.getUTCFullYear(), v.getUTCMonth(), 1) - VN_OFFSET_MS;
  return {
    members: active.length,
    communities: db.groups.length,
    online: active.length,
    newThisMonth: active.filter((m) => Date.parse(isoFromVnDate(m.date)) >= monthStart).length,
    eventsPerYear: db.events.filter((e) => Date.parse(e.startsAt) >= now - YEAR_MS).length,
  };
}
