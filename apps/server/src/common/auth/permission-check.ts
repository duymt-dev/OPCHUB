import { Inject, Injectable, Optional } from '@nestjs/common';
import { type AdminPermissionKey, hasPermission, type PermissionKey } from '@opchub/shared';
import type { AccessClaims } from './access-token';
import { AuthStateService } from './auth-state.service';

/**
 * Khoá cũ (D-20) trên route → khoá RBAC Admin §21 (TIP-V2-202). Tạm thời tới TIP-V2-203 đổi route
 * sang 25 khoá. Phiên quản trị kiểm theo vai trò `admin_roles`, không theo `systemRole`.
 */
export const LEGACY_TO_ADMIN_KEY: Record<PermissionKey, AdminPermissionKey> = {
  'm.view': 'members.view',
  'm.edit': 'members.action',
  'm.role': 'settings.admins',
  'c.create': 'groups.action',
  'c.room': 'groups.action',
  'c.mod': 'groups.moderate',
  'p.edit': 'projects.action',
  'p.pub': 'projects.action',
  'e.edit': 'events.action',
  // Tạm (route danh sách + check-in): TIP-V2-203 tách check-in sang `events.action`
  'e.reg': 'events.view',
  'n.edit': 'services.action',
  's.cfg': 'settings.general',
  's.role': 'settings.admins',
  's.log': 'settings.log',
};

/** Quyền của một vai trò Admin — cache Redis, nạp lại khi thiếu (admin-account cung cấp) */
export interface AdminGrantsPort {
  grantsOf(roleId: string): Promise<readonly string[]>;
}
export const ADMIN_GRANTS_PORT = Symbol('ADMIN_GRANTS_PORT');

/**
 * Danh bạ TK quản trị (D-52) cho domain khác: tên người thao tác (nhật ký, bình luận), nhân sự
 * có một khoá quyền (@nhắc phiếu YC). admin-account hiện thực — domain khác không import ngược.
 */
export interface AdminDirectoryPort {
  namesOf(ids: readonly string[]): Promise<Map<string, string>>;
  withPermission(key: AdminPermissionKey): Promise<{ id: string; name: string }[]>;
}
export const ADMIN_DIRECTORY_PORT = Symbol('ADMIN_DIRECTORY_PORT');

/** Kiểm permission key cho cả hai realm — guard và service dùng chung (luật 4) */
@Injectable()
export class PermissionCheck {
  constructor(
    private readonly state: AuthStateService,
    @Optional() @Inject(ADMIN_GRANTS_PORT) private readonly admin: AdminGrantsPort | null = null,
  ) {}

  /** Một lần đọc quyền → hàm kiểm nhiều khoá */
  async checker(user: AccessClaims): Promise<(key: PermissionKey) => boolean> {
    if (user.realm === 'admin') {
      const grants = user.roleId && this.admin ? await this.admin.grantsOf(user.roleId) : [];
      return (key) => grants.includes(LEGACY_TO_ADMIN_KEY[key]);
    }
    const grants = await this.state.grants();
    return (key) => hasPermission(user.systemRole, key, grants);
  }

  async can(user: AccessClaims, key: PermissionKey): Promise<boolean> {
    return (await this.checker(user))(key);
  }
}
