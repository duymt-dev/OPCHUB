import type { AdminMenuKey, AdminPermissionKey } from '@opchub/shared';
import type { IconName } from '@opchub/ui';

export type AdminNavKey =
  | 'overview'
  | 'members'
  | 'fees'
  | 'groups'
  | 'bots'
  | 'events'
  | 'needs'
  | 'stores'
  | 'projects'
  | 'investors'
  | 'requests'
  | 'affiliate'
  | 'marketing'
  | 'settings';

/** Tiêu đề nhóm sidebar (prototype v4 `GR`) — khoá `common.navGroup.*` */
export type AdminNavGroup = 'people' | 'business' | 'revenue';

interface NavDef {
  key: AdminNavKey;
  href: string;
  icon: IconName;
  /** Menu §21 — hiện khi vai trò có ≥ 1 khoá của menu (RB-R06) */
  menu: AdminMenuKey;
  /** Mục không có menu riêng trong §21.2: cần đúng khoá này */
  needs?: AdminPermissionKey;
  /** Không có → mục nằm ngay dưới tiêu đề menu "QUẢN TRỊ" (Tổng quan) */
  group?: AdminNavGroup;
}

/**
 * Menu §27.3 (D-80) theo prototype v4 `AG` + `GR`; badge đếm việc chờ xử lý lấy từ API.
 * Nhóm KẾT NỐI KINH DOANH: "Nhu cầu địa phương" (V4-609) rồi "Gian hàng" (V4-608) — cùng menu §21
 * `stores` (prototype "Gian hàng & Nhu cầu").
 * Marketing gỡ khỏi sidebar (D-73) nhưng giữ route + quyền `settings.mail` (nhật ký gửi email OTP /
 * chào mừng nằm ở đó, Q-V4-606-2). Cài đặt không ở sidebar — mở từ menu người dùng (`umSettings`).
 * Hai mục này giữ trong danh sách để kiểm quyền URL.
 */
export const ADMIN_NAV: NavDef[] = [
  { key: 'overview', href: '/overview', icon: 'overview', menu: 'overview' },
  { key: 'members', href: '/members', icon: 'members', menu: 'members', group: 'people' },
  { key: 'fees', href: '/fees', icon: 'fees', menu: 'fees', group: 'people' },
  { key: 'groups', href: '/groups', icon: 'groups', menu: 'groups', group: 'people' },
  { key: 'bots', href: '/bots', icon: 'bots', menu: 'bots', group: 'people' },
  { key: 'events', href: '/events', icon: 'events', menu: 'events', group: 'people' },
  { key: 'needs', href: '/needs', icon: 'needs', menu: 'stores', group: 'business' },
  { key: 'stores', href: '/stores', icon: 'stores', menu: 'stores', group: 'business' },
  { key: 'projects', href: '/projects', icon: 'projects', menu: 'projects', group: 'business' },
  { key: 'investors', href: '/investors', icon: 'investors', menu: 'investors', group: 'business' },
  { key: 'requests', href: '/requests', icon: 'requests', menu: 'services', group: 'revenue' },
  {
    key: 'affiliate',
    href: '/affiliate',
    icon: 'affiliate',
    menu: 'affiliate',
    needs: 'affiliate.view',
    group: 'revenue',
  },
  {
    key: 'marketing',
    href: '/marketing',
    icon: 'marketing',
    menu: 'settings',
    needs: 'settings.mail',
    group: 'revenue',
  },
  { key: 'settings', href: '/settings', icon: 'settings', menu: 'settings', group: 'revenue' },
];

/** Mục không vẽ ở sidebar (vẫn kiểm quyền URL) */
export const OFF_SIDEBAR: readonly AdminNavKey[] = ['marketing', 'settings'];
