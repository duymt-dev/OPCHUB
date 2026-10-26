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

/** `GET /admin/overview` (MSW): fixture prototype + "Luồng hệ thống" đếm từ các module giả */
export function mockOverview(): AdminOverview {
  const fees = feeSummary();
  const st = adminMockStores({ status: 'all', page: 1 }).summary;
  const nd = adminMockNeeds({ status: 'all', page: 1 }).summary;
  const pj = projectCounts();
  return {
    ...OVERVIEW_FIXTURE,
    flow: {
      paidMembers: fees.paid,
      members: fees.total,
      stores: { published: st.published, hidden: st.hidden, draft: st.draft },
      needs: { open: nd.open, closed: nd.closed },
      projects: { pending: pj.pending_review, published: pj.published },
      groups: mockDb().groups.length,
    },
  };
}
