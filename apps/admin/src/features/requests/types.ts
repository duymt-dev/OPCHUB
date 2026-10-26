export const REQUEST_PAGE_SIZES = [6, 9, 12, 24] as const;
export const REQUEST_DEFAULT_SIZE = 10;

export interface RequestParams {
  q: string;
  page: number;
  size: number;
}

/** Tab màn Dịch vụ — đường dẫn: /requests · /requests/catalog */
export type RequestTab = 'list' | 'catalog';
export const REQUEST_TAB_PATH: Record<RequestTab, string> = {
  list: '/requests',
  catalog: '/requests/catalog',
};
