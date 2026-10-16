import type { PermissionKey } from '@opchub/shared';
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
  | 'settings';

interface NavDef {
  key: AdminNavKey;
  href: string;
  icon: IconName;
  /** Permission key cần có để thấy menu (packages/shared/permissions) */
  permission: PermissionKey;
}

/** Thứ tự + icon theo prototype; badge đếm việc chờ xử lý lấy từ API sau */
export const ADMIN_NAV: NavDef[] = [
  { key: 'overview', href: '/overview', icon: 'overview', permission: 'm.view' },
  { key: 'members', href: '/members', icon: 'members', permission: 'm.view' },
  { key: 'fees', href: '/fees', icon: 'fees', permission: 'm.edit' },
  { key: 'groups', href: '/groups', icon: 'groups', permission: 'c.room' },
  { key: 'bots', href: '/bots', icon: 'bots', permission: 'c.mod' },
  { key: 'events', href: '/events', icon: 'events', permission: 'e.reg' },
  { key: 'projects', href: '/projects', icon: 'projects', permission: 'p.pub' },
  { key: 'investors', href: '/investors', icon: 'investors', permission: 'p.pub' },
  { key: 'requests', href: '/requests', icon: 'requests', permission: 'n.edit' },
  { key: 'settings', href: '/settings', icon: 'settings', permission: 's.cfg' },
];
