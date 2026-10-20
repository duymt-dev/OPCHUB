import type { AdminMenuKey, AdminPermissionKey } from '@opchub/shared';
import type { IconName } from '@opchub/ui';

export type AdminNavKey =
  | 'overview'
  | 'members'
  | 'fees'
  | 'groups'
  | 'bots'
  | 'events'
  | 'projects'
  | 'investors'
  | 'requests'
  | 'affiliate'
  | 'marketing'
  | 'settings';

interface NavDef {
  key: AdminNavKey;
  href: string;
  icon: IconName;
  /** Menu §21 — hiện khi vai trò có ≥ 1 khoá của menu (RB-R06) */
  menu: AdminMenuKey;
  /** Mục không có menu riêng trong §21.2: cần đúng khoá này */
  needs?: AdminPermissionKey;
}

/** Thứ tự + icon theo prototype ver2 (`AG`); badge đếm việc chờ xử lý lấy từ API */
export const ADMIN_NAV: NavDef[] = [
  { key: 'overview', href: '/overview', icon: 'overview', menu: 'overview' },
  { key: 'members', href: '/members', icon: 'members', menu: 'members' },
  { key: 'fees', href: '/fees', icon: 'fees', menu: 'fees' },
  { key: 'groups', href: '/groups', icon: 'groups', menu: 'groups' },
  { key: 'bots', href: '/bots', icon: 'bots', menu: 'bots' },
  { key: 'events', href: '/events', icon: 'events', menu: 'events' },
  { key: 'projects', href: '/projects', icon: 'projects', menu: 'projects' },
  { key: 'investors', href: '/investors', icon: 'investors', menu: 'investors' },
  { key: 'requests', href: '/requests', icon: 'requests', menu: 'services' },
  {
    key: 'affiliate',
    href: '/affiliate',
    icon: 'affiliate',
    menu: 'affiliate',
    needs: 'affiliate.view',
  },
  // D-33: Marketing ngoài prototype — dùng khoá "Email chào mừng & SMTP" (V2Q-123)
  {
    key: 'marketing',
    href: '/marketing',
    icon: 'marketing',
    menu: 'settings',
    needs: 'settings.mail',
  },
  { key: 'settings', href: '/settings', icon: 'settings', menu: 'settings' },
];
