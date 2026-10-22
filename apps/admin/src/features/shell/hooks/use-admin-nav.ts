'use client';

import { usePathname } from 'next/navigation';
import { useGrants } from '@/lib/permissions';
import { can, menuAccess } from '@/lib/permission-model';
import { ADMIN_NAV } from '../nav';

/** Nav theo quyền đang áp (vai trò hoặc xem thử) + mục đang mở */
export function useAdminNav() {
  const g = useGrants();
  const pathname = usePathname();
  const items = ADMIN_NAV.filter((n) =>
    n.needs ? can(g, n.needs) : menuAccess(g, n.menu).visible,
  );
  const current = ADMIN_NAV.find((n) => pathname.startsWith(n.href));
  const allowed = current ? items.includes(current) : true;
  const access = current ? menuAccess(g, current.menu) : { visible: true, readOnly: false };
  return {
    items,
    current,
    /** RB-R06: mở URL menu không có quyền → trang 403 nội bộ */
    allowed,
    readOnly: allowed && access.readOnly,
    grants: g,
    home: items[0]?.href ?? '/overview',
  };
}
