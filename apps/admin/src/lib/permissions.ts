'use client';

import type { AdminMenuKey, AdminPermissionKey } from '@opchub/shared';
import { useAuthStore } from './auth-store';
import { can, type Grants, menuAccess, type MenuAccess } from './permission-model';

/** Quyền áp cho giao diện: `preview ?? me` (luật 4 — chỉ khoá, không so tên vai trò) */
export function useGrants(): Grants {
  const me = useAuthStore((s) => s.me);
  const preview = useAuthStore((s) => s.preview);
  if (preview) return { keys: preview.permissions, roleName: preview.roleName, previewing: true };
  return { keys: me?.permissions ?? [], roleName: me?.roleName ?? '', previewing: false };
}

/** Có khoá này (xem thử: khoá ghi luôn false) */
export function useCan(key: AdminPermissionKey): boolean {
  const g = useGrants();
  if (g.previewing && !key.endsWith('.view')) return false;
  return can(g, key);
}

export function useMenuAccess(menu: AdminMenuKey): MenuAccess {
  return menuAccess(useGrants(), menu);
}
