import type { AdminMember, GroupItem } from '@opchub/shared/api-domains';

/** Trạng thái trên URL (data-state.md): `?view&type&q&page&size&onb` */
export const MEMBER_VIEWS = ['list', 'grid'] as const;
export type MemberView = (typeof MEMBER_VIEWS)[number];

export const MEMBER_TYPE_FILTERS = ['all', 'business', 'personal'] as const;
export type MemberTypeFilter = (typeof MEMBER_TYPE_FILTERS)[number];

/** Prototype: 6 / 9 / 12 / 24 mỗi trang, mặc định 10 (BR-12) */
export const PAGE_SIZES = [6, 9, 12, 24];
export const DEFAULT_PAGE_SIZE = 10;

/** V4-611 select "Khởi đầu": Tất cả / Đã hoàn tất / Chưa hoàn tất */
export const MEMBER_ONB_FILTERS = ['all', 'done', 'todo'] as const;
export type MemberOnbFilter = (typeof MEMBER_ONB_FILTERS)[number];

export interface MembersParams {
  view: MemberView;
  type: MemberTypeFilter;
  q: string;
  onb: MemberOnbFilter;
  page: number;
  size: number;
}

/** Chip nhóm đã tô màu theo thứ tự nhóm (TONES của prototype) */
export interface GroupChip {
  id: string;
  name: string;
  bg: string;
  fg: string;
}

export interface GroupLookup {
  list: GroupItem[];
  chipOf: (id: string) => GroupChip | null;
}

/** Thao tác với một thành viên — dùng chung cho dạng bảng, dạng lưới và menu ⋯ */
export interface MemberHandlers {
  toggle: (id: string) => void;
  open: (m: AdminMember) => void;
  setStatus: (m: AdminMember, status: AdminMember['status']) => void;
  assign: (ids: string[]) => void;
  /** V4-611 (D-88) "Nhắc" hoàn tất hướng dẫn bắt đầu */
  remind: (m: AdminMember) => void;
}

export interface MemberPermissions {
  edit: boolean;
}
