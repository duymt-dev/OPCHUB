import { Injectable } from '@nestjs/common';
import type { AdminPermissionKey } from '@opchub/shared';
import { type AccessClaims, PermissionCheck } from '@/common/auth';
import { GroupRoleService } from './group-role.service';

/**
 * Quyền theo nhóm (D-43) dùng chung community/chat/moderation:
 * chủ nhóm chỉ trong nhóm của mình; TK quản trị có `groups.action` mọi nhóm (§21, TIP-V2-203).
 */
@Injectable()
export class GroupAccessService {
  constructor(
    private readonly roles: GroupRoleService,
    private readonly perms: PermissionCheck,
  ) {}

  async hasPermission(user: AccessClaims, key: AdminPermissionKey): Promise<boolean> {
    return this.perms.can(user, key);
  }

  /** Chủ nhóm của nhóm này, hoặc TK quản trị có `groups.action` */
  async canManage(user: AccessClaims, groupId: string): Promise<boolean> {
    if (await this.hasPermission(user, 'groups.action')) return true;
    return (await this.roles.roleOf(groupId, user.sub)) === 'owner';
  }
}
