import { adminOverviewSchema } from '@opchub/shared/api-domains';
import type { AdminOverview } from '@opchub/shared/api-domains';
import type { ToneName } from '@opchub/ui';
import { api } from '@/lib/api-client';

/** D-01 Tổng quan — `GET /admin/overview` (B44) */
export const overviewKeys = { all: ['admin-overview'] as const };
export const fetchOverview = () => api('/admin/overview', { schema: adminOverviewSchema });

export type StatKey = 'members' | 'communities' | 'projects' | 'events';

export const STAT_KEYS: StatKey[] = ['members', 'communities', 'projects', 'events'];

export const STAT_TONES: Record<StatKey, ToneName> = {
  members: 'blue',
  communities: 'violet',
  projects: 'green',
  events: 'rose',
};

const nf = new Intl.NumberFormat('vi-VN');
export const formatCount = (v: number) => nf.format(v);

/** Chuỗi giá trị → polyline trong khung 52×22 (x 2…50, y 3…18; lớn hơn = cao hơn) */
export function sparkPoints(values: number[]): string {
  if (values.length === 0) return '';
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  const step = values.length > 1 ? 48 / (values.length - 1) : 0;
  return values
    .map((v, i) => `${Math.round(2 + i * step)},${Math.round(18 - ((v - min) / span) * 15)}`)
    .join(' ');
}

export type GrowthRow = AdminOverview['growth'][number];

const CHART_MAX = 600;
const CHART_PX = 230;

/**
 * BUG-029: trần trục = tổng cột cao nhất làm tròn lên bậc "đẹp" (1/2/2,5/5 × 10^k); dữ liệu rỗng
 * giữ trần 600 của prototype. Trục 4 mốc: trần, 2/3, 1/3, 0.
 */
export function chartMax(rows: GrowthRow[]): number {
  const top = Math.max(0, ...rows.map((r) => r.active + r.fresh + r.inactive));
  if (top <= 0) return CHART_MAX;
  const pow = 10 ** Math.floor(Math.log10(top));
  const step = [1, 1.5, 2, 3, 4, 5, 6, 8, 10].find((m) => m * pow >= top) ?? 10;
  return step * pow;
}
export const chartAxis = (max: number) =>
  [max, (max * 2) / 3, max / 3, 0].map((v) => Math.round(v));

export const barHeight = (v: number, max = CHART_MAX) =>
  Math.round((Math.min(v, max) / max) * CHART_PX);

/** "DD/MM/YYYY – DD/MM/YYYY" từ khoảng ngày VN của API */
export const rangeLabel = (r: { from: string; to: string }) => {
  const f = (d: string) => d.split('-').reverse().join('/');
  return `${f(r.from)} – ${f(r.to)}`;
};
export const growthPct = (active: number, fresh: number) =>
  active > 0 ? `+${Math.round(((fresh / active) * 100) / 3)}%` : '+0%';
