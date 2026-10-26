import type { GroupItem } from '@opchub/shared/api-domains';

export const COMMUNITY_FILTERS = ['all', 'joined', 'not'] as const;
export type CommunityFilter = (typeof COMMUNITY_FILTERS)[number];

export const COMMUNITY_SORTS = ['members', 'active', 'name'] as const;
export type CommunitySort = (typeof COMMUNITY_SORTS)[number];

/** Cỡ trang của prototype (cmPg): mặc định 9 */
export const PAGE_SIZES = [6, 9, 12, 24] as const;
export const DEFAULT_PAGE_SIZE = 9;

/** Trạng thái lọc trên URL (data-state.md) */
export interface CommunityParams {
  q: string;
  filter: CommunityFilter;
  /** 'all' hoặc tên vùng (Miền Bắc/Trung/Nam) */
  region: string;
  sort: CommunitySort;
  page: number;
  size: number;
  /** BUG-026: id nhóm cần mở form tham gia (từ rail chat) */
  join?: string | undefined;
}

/** Nhóm kèm dữ liệu hiển thị suy ra (tông màu, ảnh) */
export interface CommunityGroup extends GroupItem {
  /** Thứ tự trong danh sách gốc — quyết định tông màu và ảnh đại diện như prototype */
  order: number;
  joined: boolean;
}

export interface RegionCount {
  key: string;
  count: number;
}
