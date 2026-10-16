import type { AdminEvent } from '@opchub/shared/api-domains';

export const EVENT_STATUSES = ['all', 'open', 'almost', 'full'] as const;
export type EventStatusFilter = (typeof EVENT_STATUSES)[number];
export type EventFill = Exclude<EventStatusFilter, 'all'>;

export const EVENT_MODES = ['all', 'online', 'offline'] as const;
export type EventModeFilter = (typeof EVENT_MODES)[number];

export const EVENT_VIEWS = ['grid', 'list'] as const;
export type EventViewMode = (typeof EVENT_VIEWS)[number];

/** Cỡ trang của prototype (aeP): mặc định 9 */
export const PAGE_SIZES = [6, 9, 12, 24] as const;
export const DEFAULT_PAGE_SIZE = 9;

/** Trạng thái màn trên URL (data-state.md) */
export interface EventsParams {
  q: string;
  status: EventStatusFilter;
  mode: EventModeFilter;
  view: EventViewMode;
  page: number;
  size: number;
}

/** Sự kiện kèm số liệu hiển thị (thứ tự gốc dùng cho ảnh mẫu) */
export interface EventView extends AdminEvent {
  order: number;
  fill: EventFill;
  /** 0–100 */
  pct: number;
}

export interface EventStats {
  upcoming: number;
  registrations: number;
  /** % làm tròn */
  fillRate: number;
  online: number;
}

export type FormMode = 'online' | 'offline';

/** Trạng thái form Tạo / Sửa sự kiện */
export interface EventFormState {
  id: string | null;
  title: string;
  mode: FormMode;
  /** yyyy-mm-dd; trống khi sửa = giữ ngày cũ (như prototype) */
  date: string;
  /** Ngày hiện tại hiển thị gợi ý khi sửa, VD "T5, 22/10" */
  currentDay: string;
  /** ISO cũ — giữ ngày khi `date` trống */
  startsAt: string | null;
  start: string;
  end: string;
  place: string;
  address: string;
  mapUrl: string;
  seats: string;
  groupId: string;
  description: string;
  registrationOpen: boolean;
  coverUrl: string | null;
}

export type EventFormError = 'title' | 'titleShort' | 'date' | 'link' | 'place' | 'address' | 'map';
