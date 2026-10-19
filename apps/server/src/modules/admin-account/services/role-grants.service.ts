import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import type { AdminPermissionKey } from '@opchub/shared';
import { AuthStateService } from '@/common/auth/auth-state.service';
import { AdminRoleRepository } from '../repositories/admin-role.repository';

/**
 * Cache quyền RBAC Admin theo vai trò trong Redis `auth:admin_grants:<roleId>` (NA-28, D-52).
 * Nạp toàn bộ lúc khởi động; lưu ma trận ghi đè ngay sau commit — quyền áp ngay, KHÔNG tăng
 * perm_version (không bắt đăng nhập lại). Guard đọc ở TIP-V2-203.
 */
@Injectable()
export class RoleGrantsService implements OnApplicationBootstrap {
  constructor(
    private readonly roles: AdminRoleRepository,
    private readonly state: AuthStateService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.reloadAll();
  }

  async reloadAll(): Promise<void> {
    await this.state.setAdminGrants(await this.roles.allGrants());
  }

  async write(rows: readonly { roleId: string; keys: readonly AdminPermissionKey[] }[]) {
    await this.state.setAdminGrants(rows);
  }

  grantsOf(roleId: string): Promise<string[] | null> {
    return this.state.adminGrants(roleId);
  }
}
