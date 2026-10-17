import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import type { SystemRole } from '@opchub/db';
import { DEFAULT_ROLE_PERMISSIONS } from '@opchub/shared';
import { type RolePermissions, rolePermissionsSchema } from '@opchub/shared/api-domains';
import { AuditService } from '@/common/audit';
import { AuthStateService } from '@/common/auth/auth-state.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import type { AdminActor } from './admin-actor';

const ROLES = ['admin', 'moderator', 'member'] as const;
type ManagedRole = (typeof ROLES)[number];

const same = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && [...a].sort().join() === [...b].sort().join();

/**
 * Ma trận quyền theo vai trò (D-20/D-46, `s.role`). super_admin không lưu (luôn đủ quyền).
 * Nguồn: `role_permissions`; guard đọc bản Redis `auth:grants` (nạp lúc khởi động, ghi đè khi lưu).
 */
@Injectable()
export class RolePermissionsService implements OnApplicationBootstrap {
  constructor(
    private readonly prisma: PrismaService,
    private readonly state: AuthStateService,
    private readonly audit: AuditService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.state.setGrants({ ...DEFAULT_ROLE_PERMISSIONS, ...(await this.get()) });
  }

  async get(): Promise<RolePermissions> {
    const rows = await this.prisma.db.rolePermission.findMany({
      select: { role: true, keys: true },
    });
    const at = new Map(rows.map((r) => [r.role, r.keys]));
    return rolePermissionsSchema.parse(
      Object.fromEntries(ROLES.map((r) => [r, at.get(r) ?? DEFAULT_ROLE_PERMISSIONS[r]])),
    );
  }

  /**
   * Lưu → Redis grants (guard áp ngay) + tăng `perm_version` người thuộc vai trò đổi quyền
   * (token cũ 401 → đăng nhập lại nhận quyền mới) — 1 câu UPDATE … RETURNING.
   */
  async put(actor: AdminActor, next: RolePermissions): Promise<RolePermissions> {
    const cur = await this.get();
    const changed: SystemRole[] = ROLES.filter((r: ManagedRole) => !same(cur[r], next[r]));
    const bumped = await this.prisma.db.$transaction(async (tx) => {
      // 3 vai trò cố định — một câu upsert nhiều dòng
      await tx.$executeRaw`
        INSERT INTO role_permissions (role, keys, updated_at)
        SELECT r::system_role, k, now()
        FROM unnest(${[...ROLES]}::text[], ${ROLES.map((r) => JSON.stringify(next[r]))}::text[]) AS x(r, kj)
        CROSS JOIN LATERAL (SELECT array(SELECT json_array_elements_text(kj::json)) AS k) a
        ON CONFLICT (role) DO UPDATE SET keys = EXCLUDED.keys, updated_at = now()`;
      const rows = changed.length
        ? await tx.$queryRaw<{ id: string; perm_version: number }[]>`
            UPDATE users SET perm_version = perm_version + 1, updated_at = now()
            WHERE system_role = ANY(${changed}::system_role[]) AND deleted_at IS NULL
            RETURNING id, perm_version`
        : [];
      await this.audit.log(tx, {
        actorId: actor.id,
        action: 'roles.permissions',
        entity: 'role_permissions',
        entityId: 'roles',
        tag: 'permission',
        summary: 'cập nhật phân quyền vai trò',
        diff: { changed },
        ip: actor.ip,
      });
      return rows;
    });
    await this.state.setGrants({ ...DEFAULT_ROLE_PERMISSIONS, ...next });
    await this.state.bumpVersions(bumped.map((r) => ({ id: r.id, permVersion: r.perm_version })));
    return next;
  }
}
