/**
 * D-43: quyền theo nhóm lấy từ `group_members.group_role`. common/ không đọc bảng của domain →
 * domain community cung cấp hiện thực (B20) qua token này. Mặc định (chưa có community): null.
 */
export type GroupRoleValue = 'owner' | 'moderator' | 'member';

export interface GroupRolePort {
  /** Vai trò của user trong nhóm khi đang là thành viên (`status = member`), ngược lại null */
  roleOf(groupId: string, userId: string): Promise<GroupRoleValue | null>;
}

export const GROUP_ROLE_PORT = Symbol('GROUP_ROLE_PORT');

export const noGroupRoles: GroupRolePort = { roleOf: () => Promise.resolve(null) };

const RANK: Record<GroupRoleValue, number> = { member: 0, moderator: 1, owner: 2 };

/** owner đáp ứng yêu cầu moderator */
export const satisfiesGroupRole = (has: GroupRoleValue, need: 'owner' | 'moderator') =>
  RANK[has] >= RANK[need];
