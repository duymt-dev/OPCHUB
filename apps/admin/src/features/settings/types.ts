import type { ConfirmRequest } from '@opchub/ui';
/** Tab màn Cài đặt — ghi trên URL `/settings?tab=` (data-state.md) */
export const SETTINGS_TABS = [
  'general',
  'categories',
  'roles',
  'welcome-mail',
  'smtp',
  'admins',
  'audit-log',
  'sso',
  'languages',
] as const;
export type SettingsTab = (typeof SETTINGS_TABS)[number];

/** Bộ lọc bảng lĩnh vực (Tất cả / Dự án / Doanh nghiệp) */
export const CATEGORY_FILTERS = ['all', 'project', 'biz'] as const;
export type CategoryFilter = (typeof CATEGORY_FILTERS)[number];

export interface SettingsParams {
  tab: SettingsTab;
  /** Lĩnh vực đang sửa (D-68) */
  edit: string;
  scope: CategoryFilter;
}

/** Icon nét của danh sách tab (đường vẽ lấy theo prototype TABS) */
export const TAB_ICON: Record<SettingsTab, string> = {
  general: 'M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1z',
  categories: 'M4 6h16M4 12h10M4 18h6',
  roles: 'M12 2l8 4v6c0 5-3.4 8.7-8 10-4.6-1.3-8-5-8-10V6z',
  'welcome-mail': 'M4 4h16v16H4zM4 8l8 5 8-5',
  smtp: 'M3 5h18v14H3zM3 7l9 6 9-6',
  admins:
    'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
  'audit-log': 'M12 8v4l3 3M3 12a9 9 0 1018 0 9 9 0 00-18 0',
  sso: 'M6 11h12v9H6zM8 11V8a4 4 0 018 0v3',
  languages: 'M12 2a10 10 0 100 20 10 10 0 000-20zM2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20',
};

/** Màu chọn cho lĩnh vực (prototype CAT_COLORS) */
export const CATEGORY_COLORS = [
  '#1677FF',
  '#722ED1',
  '#13C2C2',
  '#52C41A',
  '#FAAD14',
  '#FA541C',
  '#EB2F96',
  '#2F54EB',
  '#8C8C8C',
] as const;

export type CategoryScope = 'project' | 'biz';

export interface CategoryDraft {
  id: string | null;
  name: string;
  color: string;
  scope: CategoryScope[];
}

export const EMPTY_CATEGORY: CategoryDraft = {
  id: null,
  name: '',
  color: '#1677FF',
  scope: ['project', 'biz'],
};

/** Hộp xác nhận thao tác phá huỷ / đổi quyền (D-32, D-42) — dùng chung `packages/ui` (BUG-044) */
export type { ConfirmRequest };

export type AskConfirm = (req: ConfirmRequest) => void;
