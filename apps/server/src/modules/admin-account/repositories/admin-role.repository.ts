import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import {
  type AdminPermissionKey,
  ADMIN_SYSTEM_ROLE_KEYS,
  effectiveAdminGrants,
} from '@opchub/shared';
import { PrismaService } from '@/common/prisma/prisma.service';

export interface RoleRecord {
  id: string;
  key: string | null;
  name: string;
  description: string;
  isSystem: boolean;
  createdAt: Date;
  accountCount: number;
  /** Quyền thực tế (Super Admin = 25 khoá) */
  permissions: AdminPermissionKey[];
}

const ORDER = new Map<string, number>(ADMIN_SYSTEM_ROLE_KEYS.map((k, i) => [k, i]));
const rank = (r: { key: string | null }) =>
  r.key === null ? ORDER.size : (ORDER.get(r.key) ?? ORDER.size);

/** Bảng `admin_roles` + `admin_role_permissions` — chỉ domain admin-account đọc/ghi */
@Injectable()
export class AdminRoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Mọi vai trò kèm số TK còn sống + quyền; hệ thống theo thứ tự RB-R04 rồi vai trò tự tạo (cũ → mới) */
  async list(): Promise<RoleRecord[]> {
    const rows = await this.prisma.db.adminRole.findMany({
      select: {
        id: true,
        key: true,
        name: true,
        description: true,
        isSystem: true,
        createdAt: true,
        permissions: { select: { permissionKey: true } },
        _count: { select: { users: { where: { deletedAt: null } } } },
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return rows
      .map((r) => ({
        id: r.id,
        key: r.key,
        name: r.name,
        description: r.description,
        isSystem: r.isSystem,
        createdAt: r.createdAt,
        accountCount: r._count.users,
        permissions: effectiveAdminGrants(
          r.key,
          r.permissions.map((p) => p.permissionKey as AdminPermissionKey),
        ),
      }))
      .sort((a, b) => rank(a) - rank(b));
  }

  findById(id: string) {
    return this.prisma.db.adminRole.findUnique({
      where: { id },
      select: { id: true, key: true, name: true, isSystem: true },
    });
  }

  findByIds(ids: readonly string[]) {
    return this.prisma.db.adminRole.findMany({
      where: { id: { in: [...ids] } },
      select: { id: true, key: true, name: true },
    });
  }

  create(tx: DbTx, name: string, description: string) {
    return tx.adminRole.create({
      data: { name, description, isSystem: false },
      select: { id: true },
    });
  }

  /** Chỉ vai trò tự tạo (`is_system = false`) — cập nhật có điều kiện */
  async updateCustom(
    tx: DbTx,
    id: string,
    patch: { name?: string | undefined; description?: string | undefined },
  ): Promise<boolean> {
    const data = {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
    };
    const r = await tx.adminRole.updateMany({ where: { id, isSystem: false }, data });
    return r.count === 1;
  }

  /** AT-RB05: xoá có điều kiện — không phải vai trò hệ thống, không còn TK (chưa xoá) giữ */
  async deleteUnused(tx: DbTx, id: string): Promise<boolean> {
    const n = await tx.$executeRaw`
      DELETE FROM admin_roles r WHERE r.id = ${id} AND NOT r.is_system
        AND NOT EXISTS (SELECT 1 FROM admin_users a WHERE a.role_id = r.id AND a.deleted_at IS NULL)`;
    return n === 1;
  }

  /** Số TK còn sống giữ vai trò (câu báo 409) */
  countAccounts(id: string): Promise<number> {
    return this.prisma.db.adminUser.count({ where: { roleId: id, deletedAt: null } });
  }

  /** NA-28: thay toàn bộ quyền của các vai trò — 1 DELETE + 1 INSERT theo lô (unnest) */
  async replacePermissions(
    tx: DbTx,
    matrix: ReadonlyMap<string, readonly AdminPermissionKey[]>,
  ): Promise<void> {
    const roleIds = [...matrix.keys()];
    const pairs = [...matrix].flatMap(([roleId, keys]) => keys.map((k) => [roleId, k] as const));
    await tx.$executeRaw`DELETE FROM admin_role_permissions WHERE role_id = ANY(${roleIds}::text[])`;
    if (!pairs.length) return;
    await tx.$executeRaw`
      INSERT INTO admin_role_permissions (role_id, permission_key)
      SELECT * FROM unnest(${pairs.map((p) => p[0])}::text[], ${pairs.map((p) => p[1])}::text[])`;
  }

  /** Quyền thực tế của mọi vai trò (nạp cache Redis lúc khởi động) */
  async allGrants(): Promise<{ roleId: string; keys: AdminPermissionKey[] }[]> {
    const rows = await this.prisma.db.adminRole.findMany({
      select: { id: true, key: true, permissions: { select: { permissionKey: true } } },
    });
    return rows.map((r) => ({
      roleId: r.id,
      keys: effectiveAdminGrants(
        r.key,
        r.permissions.map((p) => p.permissionKey as AdminPermissionKey),
      ),
    }));
  }
}
