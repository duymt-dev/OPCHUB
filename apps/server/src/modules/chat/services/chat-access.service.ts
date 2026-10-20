import { Injectable } from '@nestjs/common';
import {
  type AccessClaims,
  AuthStateService,
  type GroupRoleValue,
  isFeeUsable,
} from '@/common/auth';
import { viewOnlyMessage } from '@opchub/shared';
import { AppError, forbidden, notFound } from '@/common/errors';
import { GroupAccessService, GroupRoleService } from '@/modules/community';
import { RoomRepository } from '../repositories/room.repository';

export const MEMBERS_ONLY = 'Chỉ thành viên nhóm mới xem và gửi được tin nhắn';

export interface RoomRef {
  id: string;
  groupId: string;
  isDefault: boolean;
  createdBy: string | null;
  name: string;
  groupName: string;
}

/**
 * Quyền chat (S-02, D-26, D-43): thành viên `member` đọc/gửi; TK quản trị `groups.view` chỉ đọc mọi
 * phòng và nhận DTO admin (có `isSimulated`, D-48). Chủ nhóm hoặc `groups.moderate` được ghim.
 */
@Injectable()
export class ChatAccessService {
  constructor(
    private readonly rooms: RoomRepository,
    private readonly roles: GroupRoleService,
    private readonly access: GroupAccessService,
    private readonly state: AuthStateService,
  ) {}

  /**
   * Route đọc chat dùng chung Portal/Admin bỏ guard phí (`SkipMembershipFee`) để quản trị không bị 402;
   * thành viên vẫn phải còn phí — kiểm ở đây, cùng thông điệp với guard.
   */
  private async assertFee(user: AccessClaims): Promise<void> {
    const fee = (await this.state.fee(user.sub)) ?? user.membershipFee;
    if (isFeeUsable(fee, new Date())) return; // D-57: hết hạn theo valid_until tức thời
    throw new AppError('MEMBERSHIP_REQUIRED', 'Vui lòng đóng phí thành viên để tiếp tục');
  }

  async room(roomId: string): Promise<RoomRef> {
    const r = await this.rooms.find(roomId);
    if (!r) throw notFound('Không tìm thấy phòng');
    const { group, ...room } = r;
    return { ...room, groupName: group.name };
  }

  isAdminViewer(user: AccessClaims): Promise<boolean> {
    return this.access.hasPermission(user, 'groups.view');
  }

  /** Người gửi phải là thành viên (kể cả quản trị — xem chỉ đọc) */
  async assertMember(user: AccessClaims, groupId: string): Promise<GroupRoleValue> {
    const role = await this.roles.roleOf(groupId, user.sub);
    if (!role) throw forbidden(MEMBERS_ONLY);
    return role;
  }

  /** Đọc: thành viên hoặc quản trị `groups.view` */
  async assertRead(user: AccessClaims, groupId: string): Promise<{ admin: boolean }> {
    if (await this.isAdminViewer(user)) return { admin: true };
    await this.assertFee(user);
    if (await this.roles.roleOf(groupId, user.sub)) return { admin: false };
    throw forbidden(MEMBERS_ONLY);
  }

  canManage(user: AccessClaims, groupId: string): Promise<boolean> {
    return this.access.canManage(user, groupId);
  }

  /**
   * Ghim: chủ nhóm (thao tác thành viên) trước; quản trị có `groups.moderate` → `admin` (ghi audit);
   * có `groups.view` mà thiếu `groups.moderate` → `VIEW_ONLY` (RB-R07)
   */
  async pinAuthority(user: AccessClaims, groupId: string): Promise<'owner' | 'admin' | null> {
    if ((await this.roles.roleOf(groupId, user.sub)) === 'owner') return 'owner';
    if (user.realm !== 'admin') return null;
    if (await this.access.hasPermission(user, 'groups.moderate')) return 'admin';
    if (await this.isAdminViewer(user)) {
      throw new AppError('VIEW_ONLY', viewOnlyMessage(user.roleName ?? 'hiện tại'));
    }
    return null;
  }
}
