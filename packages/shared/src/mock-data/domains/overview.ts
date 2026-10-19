import type { AdminOverview } from '../../api-domains';
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

/** Số liệu Tổng quan của prototype (4.218 thành viên, 64 nhóm, 24 dự án/2 chờ duyệt, 12 sự kiện) */
const MEMBERS = 4218;
/** Prototype: "+452 thành viên tháng này", "+12%" = 452 / (4.218 − 452) */
const NEW_THIS_MONTH = 452;
const today = new Date(MOCK_NOW + 7 * 3_600_000).toISOString().slice(0, 10);

/** % mới tháng này so với tổng đầu tháng, 1 chữ số thập phân (cùng công thức server) */
export const deltaPct = (total: number, fresh: number) =>
  total - fresh > 0 ? Math.round((fresh / (total - fresh)) * 1000) / 10 : 0;

export const OVERVIEW_FIXTURE: AdminOverview = {
  range: { from: `${today.slice(0, 8)}01`, to: today },
  membersDeltaPct: deltaPct(MEMBERS, NEW_THIS_MONTH),
  newThisMonth: NEW_THIS_MONTH,
  communitiesNew: 2,
  members: { value: MEMBERS, spark: [3600, 3700, 3820, 3760, 3940, 4010, 4218] },
  communities: { value: 64, spark: [55, 57, 56, 59, 60, 61, 64] },
  projects: { value: 24, pending: 2, spark: [18, 19, 17, 22, 20, 23, 24] },
  events: { value: 12, spark: [10, 13, 9, 14, 8, 12, 12] },
  growth: GROWTH.map(([active, fresh, inactive], i) => ({
    month: MONTHS[i] ?? '',
    active,
    fresh,
    inactive,
  })),
};
