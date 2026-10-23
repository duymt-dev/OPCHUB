import { can, type Grants, menuAccess } from '@/lib/permission-model';
import { ADMIN_NAV, OFF_SIDEBAR, RETIRED_PATHS } from './nav';

const under = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

/**
 * Sidebar Admin §27.3 (D-80) theo quyền (RB-R06): mục được phép trừ mục ngoài sidebar (Cài đặt →
 * menu người dùng); URL đã gỡ (Marketing, D-73) hoặc menu không có quyền → 403 nội bộ.
 */
export function navModel(g: Grants, pathname: string) {
  const permitted = ADMIN_NAV.filter((n) =>
    n.needs ? can(g, n.needs) : menuAccess(g, n.menu).visible,
  );
  const items = permitted.filter((n) => !OFF_SIDEBAR.includes(n.key));
  const current = ADMIN_NAV.find((n) => under(pathname, n.href));
  const retired = RETIRED_PATHS.some((p) => under(pathname, p));
  const allowed = !retired && (current ? permitted.includes(current) : true);
  const access = current ? menuAccess(g, current.menu) : { visible: true, readOnly: false };
  return {
    items,
    current,
    /** RB-R06: mở URL menu không có quyền → trang 403 nội bộ */
    allowed,
    readOnly: allowed && access.readOnly,
    /** Menu người dùng hiện "Cài đặt hệ thống" khi có ≥ 1 khoá Cài đặt */
    canSettings: menuAccess(g, 'settings').visible,
    home: items[0]?.href ?? '/overview',
  };
}
