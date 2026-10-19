/**
 * D-43: quyền theo nhóm lấy từ `group_members.group_role`. common/ không đọc bảng của domain →
 * domain community cung cấp hiện thực (B20) qua token này. Mặc định (chưa có community): null.
 */
/** GR-R02: `lecturer` (Giảng viên) chỉ là nhãn hiển thị, không thêm quyền quản lý nhóm */
export type GroupRoleValue = 'owner' | 'lecturer' | 'member';

export interface GroupRolePort {
  /** Vai trò của user trong nhóm khi đang là thành viên (`status = member`), ngược lại null */
  roleOf(groupId: string, userId: string): Promise<GroupRoleValue | null>;
}

export const GROUP_ROLE_PORT = Symbol('GROUP_ROLE_PORT');

export const noGroupRoles: GroupRolePort = { roleOf: () => Promise.resolve(null) };

/** D-43 + GR-R02: quyền quản lý nhóm (duyệt, ghim) chỉ chủ nhóm */
export type GroupRoleNeed = 'owner';

export const satisfiesGroupRole = (has: GroupRoleValue, need: GroupRoleNeed) => has === need;
