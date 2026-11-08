import { Injectable } from '@nestjs/common';
import type { AdminPermissionKey } from '@opchub/shared';
import type { AdminDirectoryPort } from '@/common/auth';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RoleGrantsService } from './role-grants.service';

/** Hiện thực `ADMIN_DIRECTORY_PORT` — bảng `admin_users` nhỏ (≤ 200 dòng), một query mỗi lần gọi */
@Injectable()
export class AdminDirectoryService implements AdminDirectoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly grants: RoleGrantsService,
  ) {}

  async namesOf(ids: readonly string[]): Promise<Map<string, string>> {
    if (!ids.length) return new Map();
    const rows = await this.prisma.db.adminUser.findMany({
      where: { id: { in: [...ids] } },
      select: { id: true, name: true },
    });
    return new Map(rows.map((r) => [r.id, r.name]));
  }

  /** Audit history may reference revoked accounts too; never expose credentials or contacts. */
  listNames() {
    return this.prisma.db.adminUser.findMany({
      select: { id: true, name: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  }

  /** TK active, chưa xoá, vai trò có `key` (Super Admin luôn có) — sắp theo tên */
  async withPermission(key: AdminPermissionKey) {
    const rows = await this.prisma.db.adminUser.findMany({
      where: { deletedAt: null, status: 'active', roleId: { not: null } },
      select: { id: true, name: true, roleId: true },
      orderBy: { name: 'asc' },
    });
    const roleIds = [...new Set(rows.flatMap((r) => (r.roleId ? [r.roleId] : [])))];
    const granted = await Promise.all(roleIds.map((id) => this.grants.grantsOf(id)));
    const ok = new Set(roleIds.filter((_, i) => granted[i]?.includes(key)));
    return rows
      .filter((r) => r.roleId && ok.has(r.roleId))
      .map((r) => ({ id: r.id, name: r.name }));
  }
}
