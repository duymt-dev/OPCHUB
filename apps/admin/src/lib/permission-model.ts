import {
  ADMIN_MENUS,
  type AdminMenuKey,
  type AdminPermissionKey,
  can as hasKey,
} from '@opchub/shared';

/** Quyền thực tế đang áp: vai trò xem thử (RB-R09) hoặc vai trò của phiên */
export interface Grants {
  keys: readonly string[];
  roleName: string;
  previewing: boolean;
}

export interface MenuAccess {
  /** RB-R06: có ≥ 1 khoá của menu */
  visible: boolean;
  /** RB-R07: có quyền Xem nhưng không có khoá thao tác nào (hoặc đang xem thử) */
  readOnly: boolean;
}

export const can = (g: Grants, key: AdminPermissionKey): boolean => hasKey(g.keys, key);

/** Khoá thao tác của menu = mọi khoá không phải `<menu>.view` */
export const actionKeysOf = (menu: AdminMenuKey): AdminPermissionKey[] => {
  const m = ADMIN_MENUS.find((x) => x.key === menu);
  return m ? m.keys.filter((k) => k !== m.view) : [];
};

export function menuAccess(g: Grants, menu: AdminMenuKey): MenuAccess {
  const m = ADMIN_MENUS.find((x) => x.key === menu);
  if (!m) return { visible: false, readOnly: true };
  const visible = m.keys.some((k) => can(g, k));
  const acts = actionKeysOf(menu);
  // Xem thử: chặn mọi thao tác ghi (Super Admin không ghi thật dưới danh nghĩa vai trò khác)
  const readOnly = g.previewing || (acts.length > 0 && !acts.some((k) => can(g, k)));
  return { visible, readOnly: visible && readOnly };
}
