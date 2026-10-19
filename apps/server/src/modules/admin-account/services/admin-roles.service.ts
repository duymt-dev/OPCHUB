import { Injectable } from '@nestjs/common';
import type { AdminPermissionKey } from '@opchub/shared';
import {
  ADMIN_RBAC_ERRORS,
  type AdminRoleList,
  type AdminRoleMatrix,
  type AdminRolePatch,
  type AdminRoleRow,
} from '@opchub/shared/api-domains';
import { AuditService } from '@/common/audit';
import { AppError, conflict, notFound } from '@/common/errors';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AdminRoleRepository, type RoleRecord } from '../repositories/admin-role.repository';
import { type AdminActor, isUniqueViolation } from './admin-actor';
import { RoleGrantsService } from './role-grants.service';

const toRow = (r: RoleRecord): AdminRoleRow => ({
  id: r.id,
  key: r.key,
  name: r.name,
  description: r.description,
  isSystem: r.isSystem,
  accountCount: r.accountCount,
  permissions: r.permissions,
});

const nameTaken = () =>
  new AppError('CONFLICT', ADMIN_RBAC_ERRORS.roleNameTaken, [
    { path: 'name', message: ADMIN_RBAC_ERRORS.roleNameTaken },
  ]);

/**
 * Tab "Vai trò & phân quyền" (RB-R04, RB-R05, NA-28): liệt kê, tạo / sửa vai trò tự tạo, lưu ma
 * trận. Xoá vai trò ở TIP-V2-203. Mọi thao tác ghi audit tag `permission` cùng transaction.
 */
@Injectable()
export class AdminRolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roles: AdminRoleRepository,
    private readonly grants: RoleGrantsService,
    private readonly audit: AuditService,
  ) {}

  async list(): Promise<AdminRoleList> {
    return { items: (await this.roles.list()).map(toRow) };
  }

  async create(
    actor: AdminActor,
    body: { name: string; description: string },
  ): Promise<AdminRoleRow> {
    const id = await this.prisma.db
      .$transaction(async (tx) => {
        const r = await this.roles.create(tx, body.name, body.description);
        await this.audit.log(tx, {
          actorId: actor.id,
          action: 'roles.create',
          entity: 'admin_role',
          entityId: r.id,
          tag: 'permission',
          summary: `tạo vai trò ${body.name}`,
          ip: actor.ip,
        });
        return r.id;
      })
      .catch((err: unknown) => {
        if (isUniqueViolation(err)) throw nameTaken();
        throw err;
      });
    // Vai trò mới chưa có quyền — cache rỗng để guard (TIP-V2-203) không phải nạp DB
    await this.grants.write([{ roleId: id, keys: [] }]);
    return this.rowOf(id);
  }

  /** RB-R04: chỉ sửa tên/mô tả vai trò tự tạo; vai trò hệ thống → 409 */
  async update(actor: AdminActor, id: string, patch: AdminRolePatch): Promise<AdminRoleRow> {
    const role = await this.roles.findById(id);
    if (!role) throw notFound(ADMIN_RBAC_ERRORS.roleNotFound);
    if (role.isSystem) throw conflict(ADMIN_RBAC_ERRORS.roleSystemLocked);
    await this.prisma.db
      .$transaction(async (tx) => {
        if (!(await this.roles.updateCustom(tx, id, patch))) {
          throw conflict(ADMIN_RBAC_ERRORS.roleSystemLocked);
        }
        await this.audit.log(tx, {
          actorId: actor.id,
          action: 'roles.update',
          entity: 'admin_role',
          entityId: id,
          tag: 'permission',
          summary: `sửa vai trò ${patch.name ?? role.name}`,
          diff: { ...patch },
          ip: actor.ip,
        });
      })
      .catch((err: unknown) => {
        if (isUniqueViolation(err)) throw nameTaken();
        throw err;
      });
    return this.rowOf(id);
  }

  /**
   * NA-28: `{ [roleId]: khoá[] }` — có Super Admin → 409, DB không đổi; vai trò lạ → 404.
   * Xoá + chèn theo lô trong 1 transaction, audit `roles.permissions`; sau commit ghi Redis ngay.
   */
  async putMatrix(actor: AdminActor, matrix: AdminRoleMatrix): Promise<AdminRoleList> {
    const ids = Object.keys(matrix);
    const found = await this.roles.findByIds(ids);
    if (found.some((r) => r.key === 'super_admin')) {
      throw conflict(ADMIN_RBAC_ERRORS.superAdminMatrix);
    }
    if (found.length !== ids.length) throw notFound(ADMIN_RBAC_ERRORS.roleNotFound);
    const next = new Map<string, AdminPermissionKey[]>(
      ids.map((id) => [id, [...new Set(matrix[id] ?? [])]]),
    );
    await this.prisma.db.$transaction(async (tx) => {
      await this.roles.replacePermissions(tx, next);
      await this.audit.log(tx, {
        actorId: actor.id,
        action: 'roles.permissions',
        entity: 'admin_role_permissions',
        entityId: 'admin_roles',
        tag: 'permission',
        summary: `cập nhật phân quyền ${found.map((r) => r.name).join(', ')}`,
        diff: Object.fromEntries(next),
        ip: actor.ip,
      });
    });
    await this.grants.write([...next].map(([roleId, keys]) => ({ roleId, keys })));
    return this.list();
  }

  private async rowOf(id: string): Promise<AdminRoleRow> {
    const r = (await this.roles.list()).find((x) => x.id === id);
    if (!r) throw notFound(ADMIN_RBAC_ERRORS.roleNotFound);
    return toRow(r);
  }
}
