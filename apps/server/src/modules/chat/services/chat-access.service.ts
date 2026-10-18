import { Injectable } from '@nestjs/common';
import { type AccessClaims, AuthStateService } from '@/common/auth';
import { isFeeActive } from '@/common/auth/auth-state.service';
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
}

/**
 * Quyền chat (S-02, D-26, D-43): thành viên `member` đọc/gửi; `c.mod` (quản trị) chỉ đọc mọi phòng
 * và nhận DTO admin (có `isSimulated`, D-48). Chủ nhóm của nhóm đó hoặc `c.mod` được ghim.
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
    if (fee && isFeeActive(fee.status)) return;
    throw new AppError('MEMBERSHIP_REQUIRED', 'Vui lòng đóng phí thành viên để tiếp tục');
  }

  async room(roomId: string): Promise<RoomRef> {
    const r = await this.rooms.find(roomId);
    if (!r) throw notFound('Không tìm thấy phòng');
    return r;
  }

  isAdminViewer(user: AccessClaims): Promise<boolean> {
    return this.access.hasPermission(user, 'c.mod');
  }

  /** Người gửi phải là thành viên (kể cả quản trị — xem chỉ đọc) */
  async assertMember(
    user: AccessClaims,
    groupId: string,
  ): Promise<'owner' | 'moderator' | 'member'> {
    const role = await this.roles.roleOf(groupId, user.sub);
    if (!role) throw forbidden(MEMBERS_ONLY);
    return role;
  }

  /** Đọc: thành viên hoặc quản trị `c.mod` */
  async assertRead(user: AccessClaims, groupId: string): Promise<{ admin: boolean }> {
    if (await this.isAdminViewer(user)) return { admin: true };
    await this.assertFee(user);
    if (await this.roles.roleOf(groupId, user.sub)) return { admin: false };
    throw forbidden(MEMBERS_ONLY);
  }

  canManage(user: AccessClaims, groupId: string): Promise<boolean> {
    return this.access.canManage(user, groupId);
  }

  /** Ghim: chủ nhóm (thao tác thành viên) trước; không phải chủ mà có `c.mod` → `admin` (ghi audit) */
  async pinAuthority(user: AccessClaims, groupId: string): Promise<'owner' | 'admin' | null> {
    if ((await this.roles.roleOf(groupId, user.sub)) === 'owner') return 'owner';
    return (await this.isAdminViewer(user)) ? 'admin' : null;
  }
}
