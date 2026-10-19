import { Injectable } from '@nestjs/common';
import type { PermissionKey } from '@opchub/shared';
import { type AccessClaims, PermissionCheck } from '@/common/auth';
import { GroupRoleService } from './group-role.service';

/**
 * Quyền theo nhóm (D-43) dùng chung community/chat/moderation:
 * chủ nhóm chỉ trong nhóm của mình; `c.mod` (điều phối viên hệ thống) mọi nhóm.
 */
@Injectable()
export class GroupAccessService {
  constructor(
    private readonly roles: GroupRoleService,
    private readonly perms: PermissionCheck,
  ) {}

  async hasPermission(user: AccessClaims, key: PermissionKey): Promise<boolean> {
    return this.perms.can(user, key);
  }

  /** Chủ nhóm của nhóm này, hoặc có `c.mod` */
  async canManage(user: AccessClaims, groupId: string): Promise<boolean> {
    if (await this.hasPermission(user, 'c.mod')) return true;
    return (await this.roles.roleOf(groupId, user.sub)) === 'owner';
  }
}
