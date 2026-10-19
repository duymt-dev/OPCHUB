import { Injectable } from '@nestjs/common';
import {
  ADMIN_RBAC_ERRORS as ERR,
  type AdminAccountRow,
  type AdminAccountStatus,
} from '@opchub/shared/api-domains';
import { AuditService } from '@/common/audit';
import { AuthStateService } from '@/common/auth';
import { AppError, conflict, notFound } from '@/common/errors';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AdminRefreshTokenRepository } from '../repositories/admin-refresh-token.repository';
import { AdminRoleRepository } from '../repositories/admin-role.repository';
import { AdminUserRepository } from '../repositories/admin-user.repository';
import type { AdminActor } from './admin-actor';
import { AdminAccountsService } from './admin-accounts.service';

type Target = NonNullable<Awaited<ReturnType<AdminUserRepository['findTarget']>>>;

/**
 * Khoá / mở / thu hồi / đổi vai trò TK quản trị (RB-R04, RB-R08, SEC-R03, NA-16, D-55).
 * Super Admin không thao tác được (409). Mỗi thao tác: cập nhật có điều kiện + thu hồi refresh +
 * audit tag `permission` trong MỘT transaction; version Redis sau commit → phiên đang mở bị từ chối
 * ngay ở guard. Admin không có socket (Admin FE chỉ REST) nên không phát `session.revoked`.
 */
@Injectable()
export class AdminSecurityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: AdminUserRepository,
    private readonly roles: AdminRoleRepository,
    private readonly refresh: AdminRefreshTokenRepository,
    private readonly accounts: AdminAccountsService,
    private readonly state: AuthStateService,
    private readonly audit: AuditService,
  ) {}

  async setStatus(
    actor: AdminActor,
    id: string,
    status: AdminAccountStatus,
    reason: string | undefined,
    now = new Date(),
  ): Promise<AdminAccountRow> {
    const target = await this.target(id);
    const from = status === 'locked' ? 'active' : 'locked';
    const version = await this.prisma.db.$transaction(async (tx) => {
      // Luật 7: WHERE status = <from>; 0 dòng = đã đổi bởi người khác
      const v = await this.users.transitionStatus(tx, id, from, status);
      if (v === null) throw conflict(ERR.statusUnchanged);
      if (status === 'locked') await this.refresh.revokeAllOf(tx, id, now);
      await this.audit.log(tx, {
        actorId: actor.id,
        action: status === 'locked' ? 'admin_account.lock' : 'admin_account.unlock',
        entity: 'admin_user',
        entityId: id,
        tag: 'permission',
        summary: `${status === 'locked' ? 'khóa' : 'mở khóa'} tài khoản quản trị ${target.name}`,
        ...(reason ? { diff: { reason } } : {}),
        ip: actor.ip,
      });
      return v;
    });
    await this.state.setPermVersion(id, version, 'admin');
    await this.state.setLocked(id, status === 'locked', 'admin');
    return this.accounts.one(id);
  }

  /**
   * RB-R04: không gán Super Admin. Version tăng → access token cũ 401, FE tự refresh (cookie còn
   * hiệu lực) nhận `roleId` mới — không phải đăng nhập lại
   */
  async setRole(actor: AdminActor, id: string, roleId: string): Promise<AdminAccountRow> {
    const target = await this.target(id);
    const role = await this.roles.findById(roleId);
    if (!role) {
      throw new AppError('VALIDATION_ERROR', ERR.roleNotFound, [
        { path: 'roleId', message: ERR.roleNotFound },
      ]);
    }
    if (role.key === 'super_admin') {
      throw new AppError('VALIDATION_ERROR', ERR.roleSuperAdmin, [
        { path: 'roleId', message: ERR.roleSuperAdmin },
      ]);
    }
    if (role.id === target.roleId) return this.accounts.one(id);
    const version = await this.prisma.db.$transaction(async (tx) => {
      const v = await this.users.setRole(tx, id, role.id);
      if (v === null) throw notFound(ERR.accountNotFound);
      await this.audit.log(tx, {
        actorId: actor.id,
        action: 'admin_account.role',
        entity: 'admin_user',
        entityId: id,
        tag: 'permission',
        summary: `đổi vai trò ${target.name} thành ${role.name}`,
        diff: { from: target.role?.name ?? null, to: role.name },
        ip: actor.ip,
      });
      return v;
    });
    await this.state.setPermVersion(id, version, 'admin');
    return this.accounts.one(id);
  }

  /** Thu hồi = xoá mềm (giữ dòng cho audit) + thu hồi mọi phiên */
  async revoke(actor: AdminActor, id: string, now = new Date()): Promise<{ id: string }> {
    const target = await this.target(id);
    const version = await this.prisma.db.$transaction(async (tx) => {
      const v = await this.users.softDelete(tx, id);
      if (v === null) throw notFound(ERR.accountNotFound);
      await this.refresh.revokeAllOf(tx, id, now);
      await this.audit.log(tx, {
        actorId: actor.id,
        action: 'admin_account.revoke',
        entity: 'admin_user',
        entityId: id,
        tag: 'permission',
        summary: `thu hồi quyền quản trị của ${target.name}`,
        ip: actor.ip,
      });
      return v;
    });
    // Token cũ: version tăng → 401, refresh đã thu hồi → không lấy được phiên mới
    await this.state.setPermVersion(id, version, 'admin');
    return { id };
  }

  private async target(id: string): Promise<Target> {
    const t = await this.users.findTarget(id);
    if (!t) throw notFound(ERR.accountNotFound);
    if (t.role?.key === 'super_admin') throw conflict(ERR.superAdminProtected);
    return t;
  }
}
