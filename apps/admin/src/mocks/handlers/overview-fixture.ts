import type { AdminOverview } from '@opchub/shared/api-domains';

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
export const OVERVIEW_FIXTURE: AdminOverview = {
  members: { value: 4218, spark: [3600, 3700, 3820, 3760, 3940, 4010, 4218] },
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
