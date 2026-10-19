import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import type { AdminPermissionKey } from '@opchub/shared';
import type { AdminGrantsPort } from '@/common/auth';
import { AuthStateService } from '@/common/auth/auth-state.service';
import { AdminRoleRepository } from '../repositories/admin-role.repository';

/**
 * Cache quyền RBAC Admin theo vai trò trong Redis `auth:admin_grants:<roleId>` (NA-28, D-52).
 * Nạp toàn bộ lúc khởi động; lưu ma trận ghi đè ngay sau commit — quyền áp ngay, KHÔNG tăng
 * perm_version (không bắt đăng nhập lại). PermissionGuard đọc mỗi request.
 */
@Injectable()
export class RoleGrantsService implements OnApplicationBootstrap, AdminGrantsPort {
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

  async drop(roleId: string): Promise<void> {
    await this.state.dropAdminGrants(roleId);
  }

  /** `ADMIN_GRANTS_PORT`: cache thiếu (Redis bị xoá) → nạp lại toàn bộ từ DB một lần */
  async grantsOf(roleId: string): Promise<readonly string[]> {
    const hit = await this.state.adminGrants(roleId);
    if (hit) return hit;
    const all = await this.roles.allGrants();
    await this.state.setAdminGrants(all);
    return all.find((r) => r.roleId === roleId)?.keys ?? [];
  }
}
