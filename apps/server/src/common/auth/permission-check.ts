import { Inject, Injectable, Optional } from '@nestjs/common';
import { type AdminPermissionKey, can } from '@opchub/shared';
import type { AccessClaims } from './access-token';

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
  listNames(): Promise<{ id: string; name: string }[]>;
  namesOf(ids: readonly string[]): Promise<Map<string, string>>;
  withPermission(key: AdminPermissionKey): Promise<{ id: string; name: string }[]>;
}
export const ADMIN_DIRECTORY_PORT = Symbol('ADMIN_DIRECTORY_PORT');

/**
 * Kiểm 25 khoá RBAC (§21) — guard và service dùng chung (luật 4: chỉ khoá, không tên vai trò).
 * Phiên thành viên không có khoá quản trị nào. Quyền đọc theo `roleId` của phiên từ Redis
 * `auth:admin_grants:<roleId>` mỗi request → đổi ma trận áp ngay (NA-28).
 */
@Injectable()
export class PermissionCheck {
  constructor(
    @Optional() @Inject(ADMIN_GRANTS_PORT) private readonly admin: AdminGrantsPort | null = null,
  ) {}

  async grantsOf(user: AccessClaims): Promise<readonly string[]> {
    if (user.realm !== 'admin' || !user.roleId || !this.admin) return [];
    return this.admin.grantsOf(user.roleId);
  }

  /** Một lần đọc quyền → hàm kiểm nhiều khoá */
  async checker(user: AccessClaims): Promise<(key: AdminPermissionKey) => boolean> {
    const grants = await this.grantsOf(user);
    return (key) => can(grants, key);
  }

  async can(user: AccessClaims, key: AdminPermissionKey): Promise<boolean> {
    return (await this.checker(user))(key);
  }
}
