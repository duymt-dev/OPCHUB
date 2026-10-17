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

export const barHeight = (v: number) => Math.round((Math.min(v, CHART_MAX) / CHART_MAX) * CHART_PX);
export const growthPct = (active: number, fresh: number) =>
  active > 0 ? `+${Math.round(((fresh / active) * 100) / 3)}%` : '+0%';
