import type { IconName } from '@opchub/ui';

export type PortalNavKey =
  'dashboard' | 'community' | 'chat' | 'events' | 'stores' | 'projects' | 'affiliate' | 'services';

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
 * Menu §27.3 (D-80) theo thứ tự prototype v4 `PN`. "Gian hàng địa phương" (V4-608) mở nhóm
 * KẾT NỐI KINH DOANH; "Nhu cầu địa phương" do V4-609 thêm phía trên khi có màn.
 */
export const PORTAL_NAV: NavDef[] = [
  { key: 'dashboard', href: '/dashboard', icon: 'overview' },
  { key: 'chat', href: '/chat', icon: 'chat', group: 'community' },
  { key: 'community', href: '/community', icon: 'community' },
  { key: 'events', href: '/events', icon: 'events' },
  { key: 'stores', href: '/stores', icon: 'store', group: 'business' },
  { key: 'projects', href: '/projects', icon: 'projects' },
  { key: 'services', href: '/services', icon: 'services', group: 'account' },
  { key: 'affiliate', href: '/affiliate', icon: 'affiliate' },
];
