import type { useBankReconcile } from './hooks/use-bank-reconcile';
import type { AdminPermissionKey } from '@opchub/shared';
import type { ConfirmRequest } from '@opchub/ui';
/** Tab màn Cài đặt — ghi trên URL `/settings?tab=` (data-state.md) */
export const SETTINGS_TABS = [
  'general',
  'categories',
  'roles',
  'welcome-mail',
  'smtp',
  'price',
  'renewal',
  'bank',
  'admins',
  'audit-log',
  'sso',
  'languages',
  'llm',
] as const;
export type SettingsTab = (typeof SETTINGS_TABS)[number];

/**
 * RB-R06: khoá cần để thấy tab (prototype `stTabs.need`); SSO + Ngôn ngữ (D-33, ngoài prototype)
 * theo khoá "Thông tin chung"
 */
export const TAB_KEY: Record<SettingsTab, AdminPermissionKey> = {
  general: 'settings.general',
  categories: 'settings.general',
  roles: 'settings.admins',
  'welcome-mail': 'settings.mail',
  smtp: 'settings.mail',
  llm: 'settings.general',
  // D-94 5A: prototype `need.price = 'cfg'`
  price: 'settings.general',
  renewal: 'settings.mail',
  bank: 'settings.general',
  admins: 'settings.admins',
  'audit-log': 'settings.log',
  sso: 'settings.general',
  languages: 'settings.general',
};

/** Bộ lọc bảng lĩnh vực (Tất cả / Dự án / Doanh nghiệp / Nhóm ngành mạng lưới — v4) */
export const CATEGORY_FILTERS = ['all', 'project', 'biz', 'net'] as const;
export type CategoryFilter = (typeof CATEGORY_FILTERS)[number];

export interface SettingsParams {
  tab: SettingsTab;
  /** Lĩnh vực đang sửa (D-68) */
  edit: string;
  scope: CategoryFilter;
}

/** Icon nét của danh sách tab (đường vẽ lấy theo prototype TABS) */
export const TAB_ICON: Record<SettingsTab, string> = {
  bank: 'M3 10h18L12 3zM5 10v9M10 10v9M14 10v9M19 10v9M2 21h20',
  renewal: 'M12 8v4l3 3M3 12a9 9 0 1018 0 9 9 0 00-18 0',
  general: 'M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1z',
  categories: 'M4 6h16M4 12h10M4 18h6',
  roles: 'M12 2l8 4v6c0 5-3.4 8.7-8 10-4.6-1.3-8-5-8-10V6z',
  'welcome-mail': 'M4 4h16v16H4zM4 8l8 5 8-5',
  smtp: 'M3 5h18v14H3zM3 7l9 6 9-6',
  llm: 'M4 4h16v12H4zM8 20h8M12 16v4M9 9h.01M15 9h.01M9 12h6',
  price: 'M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0L2 12V2h10l8.6 8.6a2 2 0 010 2.8zM7 7h.01',
  admins:
    'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
  'audit-log': 'M12 8v4l3 3M3 12a9 9 0 1018 0 9 9 0 00-18 0',
  sso: 'M6 11h12v9H6zM8 11V8a4 4 0 018 0v3',
  languages: 'M12 2a10 10 0 100 20 10 10 0 000-20zM2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20',
};

export type BankPanel = ReturnType<typeof useBankReconcile>;

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

import type { CategoryScope } from '@opchub/shared/api-domains';
export type { CategoryScope };

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
