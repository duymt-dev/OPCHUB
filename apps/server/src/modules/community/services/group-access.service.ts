import { Injectable } from '@nestjs/common';
import { hasPermission, type PermissionKey } from '@opchub/shared';
import { type AccessClaims, AuthStateService } from '@/common/auth';
import { GroupRoleService } from './group-role.service';

/**
 * Quyền theo nhóm (D-43) dùng chung community/chat/moderation:
 * chủ nhóm chỉ trong nhóm của mình; `c.mod` (điều phối viên hệ thống) mọi nhóm.
 */
@Injectable()
export class GroupAccessService {
  constructor(
    private readonly roles: GroupRoleService,
    private readonly state: AuthStateService,
  ) {}

  async hasPermission(user: AccessClaims, key: PermissionKey): Promise<boolean> {
    return hasPermission(user.systemRole, key, await this.state.grants());
  }

  /** Chủ nhóm của nhóm này, hoặc có `c.mod` */
  async canManage(user: AccessClaims, groupId: string): Promise<boolean> {
    if (await this.hasPermission(user, 'c.mod')) return true;
    return (await this.roles.roleOf(groupId, user.sub)) === 'owner';
  }
}
