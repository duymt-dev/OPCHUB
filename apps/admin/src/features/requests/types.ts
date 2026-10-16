import type { ServiceRequestState } from '@opchub/shared/api-domains';

/** Thứ tự tiến trình (step bar 1–5) — prototype ORDER */
export const REQUEST_ORDER: readonly ServiceRequestState[] = [
  'new',
  'consulting',
  'quoted',
  'won',
  'done',
];
/** Thẻ thống kê + chip lọc: tiến trình rồi "Từ chối" */
export const REQUEST_STATUS_TABS: readonly ServiceRequestState[] = [...REQUEST_ORDER, 'lost'];
export const REQUEST_FILTERS = [
  'all',
  'new',
  'consulting',
  'quoted',
  'won',
  'done',
  'lost',
] as const;
export type RequestFilter = (typeof REQUEST_FILTERS)[number];

export const REQUEST_PAGE_SIZES = [6, 9, 12, 24] as const;
export const REQUEST_DEFAULT_SIZE = 10;

export interface RequestParams {
  q: string;
  status: RequestFilter;
  page: number;
  size: number;
}

/** Tab màn Dịch vụ — đường dẫn: /requests · /requests/catalog */
export type RequestTab = 'list' | 'catalog';
export const REQUEST_TAB_PATH: Record<RequestTab, string> = {
  list: '/requests',
  catalog: '/requests/catalog',
};
