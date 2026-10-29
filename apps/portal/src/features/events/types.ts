import type { EventItem } from '@opchub/shared/api-domains';

/** Bộ lọc trên URL (data-state.md): `?filter=mine|online|offline&q=` */
export const EVENT_FILTERS = ['all', 'mine', 'online', 'offline'] as const;
export type EventFilter = (typeof EVENT_FILTERS)[number];

export interface EventsParams {
  q: string;
  filter: EventFilter;
}

/** Trạng thái nút đăng ký của một sự kiện với người đang xem */
export type RegState = 'registered' | 'full' | 'open' | 'closed';

export interface EventView extends EventItem {
  /** Thứ tự trong danh sách gốc — chọn ảnh đại diện mẫu */
  order: number;
  reg: RegState;
  /** "54/80" */
  regText: string;
  /** 0 → 100 */
  pct: number;
}
