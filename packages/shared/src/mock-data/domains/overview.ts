import type { AdminOverview } from '../../api-domains';
import { feeSummary } from './fees-admin';
import { adminMockNeeds } from './needs';
import { projectCounts } from './project-admin';
import { mockDb } from './store';
import { adminMockStores } from './stores';
import { MOCK_NOW } from './util';

const MONTHS = ['T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10'];
/** [đang hoạt động, mới, chưa kích hoạt] — đúng biểu đồ prototype */
const GROWTH: [number, number, number][] = [
  [220, 90, 60],
  [260, 110, 70],
  [300, 120, 80],
  [380, 140, 90],
  [340, 120, 85],
  [300, 130, 70],
  [250, 115, 65],
];

/**
 * Số liệu Tổng quan của prototype v4 (D-89): thẻ "Thành viên 20.000 · +12% tháng này", "Cộng đồng
 * 120 · +2 nhóm mới", "Thành viên mới 2.165 · Tháng 10/2026", "Sự kiện 12 · 4 sắp diễn ra"; biểu đồ
 * "4.218 · +12% · +452 thành viên tháng này" (thành viên đã kích hoạt phí).
 */
const MEMBERS = 20000;
const NEW_THIS_MONTH = 2165;
const PAID = 4218;
const PAID_NEW = 452;
const today = new Date(MOCK_NOW + 7 * 3_600_000).toISOString().slice(0, 10);

/** % mới tháng này so với tổng đầu tháng, 1 chữ số thập phân (cùng công thức server) */
export const deltaPct = (total: number, fresh: number) =>
  total - fresh > 0 ? Math.round((fresh / (total - fresh)) * 1000) / 10 : 0;

/** Phần cố định (seed `stats_daily` dùng chung); `flow` tính trực tiếp từ CSDL giả ở handler */
export const OVERVIEW_FIXTURE: Omit<AdminOverview, 'flow'> = {
  range: { from: `${today.slice(0, 8)}01`, to: today },
  membersDeltaPct: deltaPct(MEMBERS, NEW_THIS_MONTH),
  newThisMonth: NEW_THIS_MONTH,
  newMembersSpark: GROWTH.map((g) => g[1]),
  communitiesNew: 2,
  members: { value: MEMBERS, spark: [17100, 17600, 18100, 17900, 18700, 19100, 20000] },
  communities: { value: 120, spark: [111, 113, 112, 115, 116, 117, 120] },
  projects: { value: 11, pending: 2, spark: [6, 7, 7, 8, 9, 10, 11] },
  events: { value: 12, upcoming: 4, spark: [10, 13, 9, 14, 8, 12, 12] },
  paid: { value: PAID, newThisMonth: PAID_NEW, deltaPct: deltaPct(PAID, PAID_NEW) },
  growth: GROWTH.map(([active, fresh, inactive], i) => ({
    month: MONTHS[i] ?? '',
    active,
    fresh,
    inactive,
  })),
};

/** Calendar aggregation of the same monthly snapshots used by native demo seed. */
function periodKey(day: string, period: 'week' | 'month' | 'year'): string {
  if (period === 'month') return day.slice(0, 7);
  if (period === 'year') return day.slice(0, 4);
  const date = new Date(day + 'T00:00:00Z');
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const year = date.getUTCFullYear();
  const week = Math.ceil(((date.getTime() - Date.UTC(year, 0, 1)) / 864e5 + 1) / 7);
  return year + '-W' + String(week).padStart(2, '0');
}

function mockSeries(period: 'week' | 'month' | 'year', now: Date) {
  const vn = new Date(now.getTime() + 7 * 3_600_000);
  const seed = new Date(MOCK_NOW + 7 * 3_600_000);
  const snapshots = GROWTH.map(([active, fresh, inactive], i) => {
    const date =
      i === 6 ? seed : new Date(Date.UTC(seed.getUTCFullYear(), seed.getUTCMonth() - 5 + i, 0));
    return { day: date.toISOString().slice(0, 10), active, fresh, inactive, index: i };
  });
  return Array.from({ length: period === 'year' ? 5 : 7 }, (_, i) => {
    const date =
      period === 'week'
        ? new Date(vn.getTime() - (6 - i) * 7 * 864e5)
        : new Date(
            Date.UTC(
              vn.getUTCFullYear() - (period === 'year' ? 4 - i : 0),
              period === 'month' ? vn.getUTCMonth() - 6 + i : 0,
              1,
            ),
          );
    const key = periodKey(date.toISOString().slice(0, 10), period);
    const rows = snapshots.filter(
      (r) => r.day <= vn.toISOString().slice(0, 10) && periodKey(r.day, period) === key,
    );
    const last = rows.at(-1);
    return {
      month: period === 'month' ? 'T' + (date.getUTCMonth() + 1) : key.replace(/^.*-W0?/, 'W'),
      active: last?.active ?? 0,
      fresh: rows.reduce((sum, r) => sum + r.fresh, 0),
      inactive: last?.inactive ?? 0,
      index: last?.index,
    };
  });
}

/** D-140: live totals and bounded new-member/paid cohorts, not historical snapshots. */
export function mockOverview(
  query?: {
    period?: 'week' | 'month' | 'year' | undefined;
    from?: string | undefined;
    to?: string | undefined;
  },
  now = new Date(),
): AdminOverview {
  const fees = feeSummary();
  const db = mockDb();
  const st = adminMockStores({ status: 'all', page: 1 }).summary;
  const nd = adminMockNeeds({ status: 'all', page: 1 }).summary;
  const pj = projectCounts();
  const today = new Date(now.getTime() + 7 * 3_600_000).toISOString().slice(0, 10);
  const range = { from: query?.from ?? today.slice(0, 8) + '01', to: query?.to ?? today };
  const start = Date.parse(range.from + 'T00:00:00+07:00');
  const end = Date.parse(range.to + 'T00:00:00+07:00') + 864e5;
  const inside = (at: string | null) =>
    at !== null && Date.parse(at) >= start && Date.parse(at) < end;
  const fresh = db.fees.filter((f) => inside(f.joinedAt)).length;
  const newPaid = db.fees.filter(
    (f) => ['active', 'expiring'].includes(f.status) && inside(f.paidAt),
  ).length;
  const months = mockSeries('month', now);
  const spark = (values: number[]) =>
    months.map((m) => (m.index === undefined ? 0 : (values[m.index] ?? 0)));
  return {
    ...OVERVIEW_FIXTURE,
    range,
    newThisMonth: fresh,
    newMembersSpark: months.map((m) => m.fresh),
    membersDeltaPct: deltaPct(fees.total, fresh),
    communitiesNew: MOCK_NOW >= start && MOCK_NOW < end ? db.groups.length : 0,
    members: { value: fees.total, spark: spark(OVERVIEW_FIXTURE.members.spark) },
    communities: { value: db.groups.length, spark: spark(OVERVIEW_FIXTURE.communities.spark) },
    projects: {
      value: pj.published,
      pending: pj.pending_review,
      spark: spark(OVERVIEW_FIXTURE.projects.spark),
    },
    events: {
      value: db.events.length,
      upcoming: db.events.filter((e) => Date.parse(e.startsAt) >= now.getTime()).length,
      spark: spark(OVERVIEW_FIXTURE.events.spark),
    },
    paid: { value: fees.paid, newThisMonth: newPaid, deltaPct: deltaPct(fees.paid, newPaid) },
    growth: mockSeries(query?.period ?? 'month', now).map(({ month, active, fresh, inactive }) => ({
      month,
      active,
      fresh,
      inactive,
    })),
    flow: {
      paidMembers: fees.paid,
      members: fees.total,
      stores: { published: st.published, hidden: st.hidden, draft: st.draft },
      needs: { open: nd.open, closed: nd.closed },
      projects: { pending: pj.pending_review, published: pj.published },
      groups: db.groups.length,
    },
  };
}
