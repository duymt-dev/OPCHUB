import type { DefaultRoomKey, GroupItem, GroupMemberRow, Report } from '@opchub/shared/api-domains';

export const GROUP_TABS = ['list', 'mod'] as const;
export type GroupTab = (typeof GROUP_TABS)[number];

export const GROUP_VIEWS = ['grid', 'list'] as const;
export type GroupView = (typeof GROUP_VIEWS)[number];

export const GROUP_SORTS = ['members', 'weekly', 'name'] as const;
export type GroupSort = (typeof GROUP_SORTS)[number];

export const REGIONS = ['all', 'Miền Bắc', 'Miền Trung', 'Miền Nam'] as const;

/** Cỡ trang của prototype (grP): mặc định 12 */
export const PAGE_SIZES = [6, 9, 12, 24] as const;
export const DEFAULT_PAGE_SIZE = 12;

export const REPORT_FILTERS = ['all', 'auto', 'report'] as const;
export type ReportFilter = (typeof REPORT_FILTERS)[number];

/** Trạng thái màn trên URL (data-state.md) */
export interface GroupsParams {
  tab: GroupTab;
  view: GroupView;
  region: string;
  q: string;
  sort: GroupSort;
  page: number;
  size: number;
  rep: ReportFilter;
}

/** Nhóm kèm thứ tự gốc (tông màu như prototype) */
export interface AdminGroup extends GroupItem {
  order: number;
}

export interface GroupStats {
  groups: number;
  provinces: number;
  members: number;
  weekly: number;
}

/** Bản nháp form Tạo/Sửa nhóm (drawer) */
export interface GroupFormState {
  id: string | null;
  name: string;
  province: string;
  description: string;
  ownerId: string;
  lecturerIds: string[];
  rooms: DefaultRoomKey[];
  extraRooms: { name: string; description: string }[];
  rules: string[];
  coverUrl: string | null;
}

export type GroupFormErr = 'name' | 'province' | 'duplicate' | 'desc' | 'owner';
/** Ô của form nhóm có thể báo lỗi; `duplicate` gắn vào ô `province` */
export type GroupField = 'name' | 'province' | 'description' | 'ownerId';
export type GroupFormErrors = Partial<Record<GroupField, GroupFormErr>>;

export interface Person {
  id: string;
  name: string;
}

/** Trường của hộp "Xuất danh sách thành viên nhóm" (thứ tự prototype) */
export const EXPORT_FIELDS = [
  'group',
  'name',
  'email',
  'phone',
  'type',
  'company',
  'tax',
  'grole',
  'country',
  'date',
  'status',
] as const;
export type ExportField = (typeof EXPORT_FIELDS)[number];
export const DEFAULT_EXPORT_FIELDS: ExportField[] = [
  'group',
  'name',
  'email',
  'phone',
  'type',
  'company',
  'grole',
  'date',
  'status',
];

export type ExportStatus = 'all' | 'active' | 'locked';
export type ExportFormat = 'csv' | 'xls';

export type { GroupMemberRow, Report };
