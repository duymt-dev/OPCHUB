import type { AdminMember, GroupItem } from '@opchub/shared/api-domains';

/** Trạng thái trên URL (data-state.md): `?view&type&q&page&size&grp&role&fee&st&prof&day` */
export const MEMBER_VIEWS = ['list', 'grid'] as const;
export type MemberView = (typeof MEMBER_VIEWS)[number];

export const MEMBER_TYPE_FILTERS = ['all', 'business', 'personal'] as const;
export type MemberTypeFilter = (typeof MEMBER_TYPE_FILTERS)[number];

/** Prototype: 6 / 9 / 12 / 24 mỗi trang, mặc định 10 (BR-12) */
export const PAGE_SIZES = [6, 9, 12, 24];
export const DEFAULT_PAGE_SIZE = 10;

/** Thanh lọc v4 (`_mfVals`): '' = Tất cả. D-107: Phí = Đã đóng phí · Miễn phí 3 tháng · Chưa đóng / Hết hạn */
export const MEMBER_FEE_FILTERS = ['', 'paid', 'trial', 'unpaid'] as const;
export const MEMBER_STATUS_FILTERS = ['', 'active', 'locked'] as const;
export const MEMBER_PROFILE_FILTERS = ['', 'done', 'inc'] as const;
export const MEMBER_DAY_FILTERS = ['', '7', '30', '90', '365'] as const;
/** Vai trò khi đăng ký: Doanh nghiệp + vai trò đăng ký cá nhân (prototype `REG_ROLES`) */
export const MEMBER_ROLE_FILTERS = [
  '',
  'business',
  'expert',
  'lecturer',
  'engineer',
  'investor',
  'freelancer',
  'student',
] as const;

export interface MemberFilters {
  grp: string;
  role: (typeof MEMBER_ROLE_FILTERS)[number];
  fee: (typeof MEMBER_FEE_FILTERS)[number];
  st: (typeof MEMBER_STATUS_FILTERS)[number];
  prof: (typeof MEMBER_PROFILE_FILTERS)[number];
  day: (typeof MEMBER_DAY_FILTERS)[number];
}

export interface MembersParams extends MemberFilters {
  view: MemberView;
  type: MemberTypeFilter;
  q: string;
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
}

export interface MemberPermissions {
  edit: boolean;
}
