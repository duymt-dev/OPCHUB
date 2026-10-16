import type { LiveStatus } from '@opchub/shared/api-domains';

/** Bộ lọc chú thích LIVE: tất cả hoặc một trạng thái */
export const LIVE_FILTERS = ['all', 'chat', 'online', 'event', 'off'] as const;
export type LiveFilter = (typeof LIVE_FILTERS)[number];

/** Cỡ trang lưới LIVE (prototype: 8 / 12 / 16 / 24) */
export const LIVE_PAGE_SIZES = [8, 12, 16, 24] as const;
export const DEFAULT_LIVE_SIZE = 12;

export interface DashboardParams {
  live: LiveFilter;
  page: number;
  size: number;
}

/** Màu theo trạng thái (prototype D_MS) */
export const STATUS_COLORS: Record<LiveStatus, { color: string; bg: string }> = {
  chat: { color: '#52C41A', bg: '#F6FFED' },
  online: { color: '#1677FF', bg: '#E6F4FF' },
  event: { color: '#FAAD14', bg: '#FFFBE6' },
  off: { color: 'rgba(0,0,0,0.45)', bg: '#F0F0F0' },
};

export const FILTER_COLORS: Record<LiveFilter, string> = {
  all: 'rgba(0,0,0,0.88)',
  ...Object.fromEntries(Object.entries(STATUS_COLORS).map(([k, v]) => [k, v.color])),
} as Record<LiveFilter, string>;
