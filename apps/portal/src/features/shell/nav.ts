import type { IconName } from '@opchub/ui';

export type PortalNavKey =
  'dashboard' | 'community' | 'chat' | 'events' | 'projects' | 'affiliate' | 'services';

/** Tiêu đề nhóm sidebar (prototype v4 `GR`) — khoá `common.navGroup.*` */
export type PortalNavGroup = 'community' | 'business' | 'account';

interface NavDef {
  key: PortalNavKey;
  href: string;
  icon: IconName;
  /** Mục đầu nhóm: hiện tiêu đề nhóm phía trên */
  group?: PortalNavGroup;
}

/**
 * Menu §27.3 (D-80) theo thứ tự prototype v4 `PN`. "Nhu cầu địa phương" / "Gian hàng địa phương"
 * (đầu nhóm KẾT NỐI KINH DOANH) do V4-609 / V4-608 thêm khi có màn — chưa có thì Dự án OPC mở nhóm.
 */
export const PORTAL_NAV: NavDef[] = [
  { key: 'dashboard', href: '/dashboard', icon: 'overview' },
  { key: 'chat', href: '/chat', icon: 'chat', group: 'community' },
  { key: 'community', href: '/community', icon: 'community' },
  { key: 'events', href: '/events', icon: 'events' },
  { key: 'projects', href: '/projects', icon: 'projects', group: 'business' },
  { key: 'services', href: '/services', icon: 'services', group: 'account' },
  { key: 'affiliate', href: '/affiliate', icon: 'affiliate' },
];
