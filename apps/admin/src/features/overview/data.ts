import type { ToneName } from '@opchub/ui';

/**
 * Số liệu Tổng quan của prototype. Khi có backend thay bằng GET /v1/admin/overview;
 * giữ ở đây để màn khung đạt parity trước.
 */
export interface OverviewStat {
  key: 'members' | 'communities' | 'projects' | 'events';
  value: string;
  tone: ToneName;
  spark: string;
  pendingProjects?: number;
}

export const OVERVIEW_STATS: OverviewStat[] = [
  { key: 'members', value: '4.218', tone: 'blue', spark: '2,18 12,12 20,15 30,7 40,10 50,3' },
  { key: 'communities', value: '64', tone: 'violet', spark: '2,16 12,14 22,15 32,10 42,9 50,5' },
  {
    key: 'projects',
    value: '24',
    tone: 'green',
    spark: '2,14 12,16 22,9 32,12 42,6 50,8',
    pendingProjects: 2,
  },
  { key: 'events', value: '12', tone: 'rose', spark: '2,10 10,14 20,8 30,15 40,9 50,12' },
];

/** [tháng, đang hoạt động, mới, chưa kích hoạt] */
export const GROWTH_MONTHS: [string, number, number, number][] = [
  ['T4', 220, 90, 60],
  ['T5', 260, 110, 70],
  ['T6', 300, 120, 80],
  ['T7', 380, 140, 90],
  ['T8', 340, 120, 85],
  ['T9', 300, 130, 70],
  ['T10', 250, 115, 65],
];

const CHART_MAX = 600;
const CHART_PX = 230;

export const barHeight = (v: number) => Math.round((v / CHART_MAX) * CHART_PX);
export const growthPct = (active: number, fresh: number) =>
  `+${Math.round(((fresh / active) * 100) / 3)}%`;
