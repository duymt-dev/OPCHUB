import type { IconName } from '@opchub/ui';

export type PortalNavKey = 'dashboard' | 'community' | 'chat' | 'events' | 'projects' | 'services';

interface NavDef {
  key: PortalNavKey;
  href: string;
  icon: IconName;
}

/** Thứ tự + icon theo prototype */
export const PORTAL_NAV: NavDef[] = [
  { key: 'dashboard', href: '/dashboard', icon: 'overview' },
  { key: 'community', href: '/community', icon: 'community' },
  { key: 'chat', href: '/chat', icon: 'chat' },
  { key: 'events', href: '/events', icon: 'events' },
  { key: 'projects', href: '/projects', icon: 'projects' },
  { key: 'services', href: '/services', icon: 'services' },
];
