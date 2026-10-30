import { Injectable } from '@nestjs/common';
import type { AdminPermissionKey } from '@opchub/shared';
import type { DbTx } from '@opchub/db';
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

  async actor(tx: DbTx, id: string) {
    const row = await tx.adminUser.findFirst({
      where: { id, deletedAt: null, status: 'active' },
      select: { id: true, name: true, role: { select: { name: true } } },
    });
    return row ? { id: row.id, name: row.name, role: row.role?.name ?? '' } : null;
  }

  async namesOf(ids: readonly string[]): Promise<Map<string, string>> {
    if (!ids.length) return new Map();
    const rows = await this.prisma.db.adminUser.findMany({
      where: { id: { in: [...ids] } },
      select: { id: true, name: true },
    });
    return new Map(rows.map((r) => [r.id, r.name]));
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
