import { Inject, Injectable } from '@nestjs/common';
import {
  ADMIN_RBAC_ERRORS,
  type AdminAccountCreateParsed,
  type AdminAccountList,
  type AdminAccountRow,
} from '@opchub/shared/api-domains';
import { AuditService } from '@/common/audit';
import { ENV, type Env } from '@/common/config';
import { AppError, notFound } from '@/common/errors';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PresenceService } from '@/common/realtime/presence.service';
import { MemberDirectory, PasswordService } from '@/modules/account';
import { adminLoginMail, MailService } from '@/modules/mail';
import { AdminRoleRepository } from '../repositories/admin-role.repository';
import { AdminUserRepository } from '../repositories/admin-user.repository';
import { type AdminActor, isUniqueViolation } from './admin-actor';

type AdminRow = Awaited<ReturnType<AdminUserRepository['listLive']>>[number];

const toRow = (u: AdminRow, online: boolean): AdminAccountRow => ({
  id: u.id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  avatarUrl: u.avatarUrl,
  roleId: u.roleId,
  roleName: u.role?.name ?? null,
  isSuperAdmin: u.role?.key === 'super_admin',
  twoFactor: u.totpSecretEnc !== null,
  status: u.status,
  online,
  lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
  createdAt: u.createdAt.toISOString(),
});

const emailConflict = (message: string) =>
  new AppError('CONFLICT', message, [{ path: 'email', message }]);

/**
 * Tab "Tài khoản quản trị" (RB-R02, QT-RB-01, D-52): liệt kê + tạo TK quản trị trong `admin_users`.
 * Khoá / đổi vai trò / thu hồi ở `AdminSecurityService` (TIP-V2-202). Email không trùng TK quản trị khác hoặc thành viên
 * (thành viên kiểm qua `MemberDirectory` của account — không đọc bảng `users`).
 */
@Injectable()
export class AdminAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: AdminUserRepository,
    private readonly roles: AdminRoleRepository,
    private readonly members: MemberDirectory,
    private readonly passwords: PasswordService,
    private readonly mail: MailService,
    private readonly audit: AuditService,
    private readonly presence: PresenceService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async list(): Promise<AdminAccountList> {
    const rows = await this.users.listLive();
    const online = await this.presence.usersOnline(rows.map((r) => r.id));
    return { items: rows.map((r) => toRow(r, online.has(r.id))) };
  }

  async one(id: string): Promise<AdminAccountRow> {
    const row = await this.users.findLive(id);
    if (!row) throw notFound(ADMIN_RBAC_ERRORS.accountNotFound);
    const online = await this.presence.usersOnline([id]);
    return toRow(row, online.has(id));
  }

  /**
   * Thứ tự kiểm: vai trò (không Super Admin) → email trùng TK quản trị → email trùng thành viên
   * (AT-RB01). Tạo TK + mail đăng nhập (outbox) + audit trong MỘT transaction (luật 8, 10).
   */
  async create(actor: AdminActor, body: AdminAccountCreateParsed): Promise<AdminAccountRow> {
    const role = await this.roles.findById(body.roleId);
    if (!role) {
      throw new AppError('VALIDATION_ERROR', ADMIN_RBAC_ERRORS.roleNotFound, [
        { path: 'roleId', message: ADMIN_RBAC_ERRORS.roleNotFound },
      ]);
    }
    if (role.key === 'super_admin') {
      throw new AppError('VALIDATION_ERROR', ADMIN_RBAC_ERRORS.roleSuperAdmin, [
        { path: 'roleId', message: ADMIN_RBAC_ERRORS.roleSuperAdmin },
      ]);
    }
    const [isAdmin, isMember] = await Promise.all([
      this.users.emailExists(body.email),
      this.members.emailTaken(body.email),
    ]);
    if (isAdmin) throw emailConflict(ADMIN_RBAC_ERRORS.emailAdminTaken);
    if (isMember) throw emailConflict(ADMIN_RBAC_ERRORS.emailMemberTaken);
    const passwordHash = await this.passwords.hash(body.password);
    const m = adminLoginMail({
      name: body.name,
      loginUrl: `${this.env.ADMIN_URL}/login`,
      email: body.email,
      tempPassword: body.password,
      roleName: role.name,
    });
    const created = await this.prisma.db
      .$transaction(async (tx) => {
        const u = await this.users.create(tx, {
          name: body.name,
          email: body.email,
          phone: body.phone,
          roleId: role.id,
          passwordHash,
          createdBy: actor.id,
        });
        // Thư chứa mật khẩu tạm → kind `password_reset` (V2Q-113): ưu tiên 1, nội dung xoá khi
        // gửi xong / lỗi cuối, không "Gửi lại" — enum mail_kind không đổi ở TIP này
        await this.mail.request(tx, {
          to: u.email,
          kind: 'password_reset',
          subject: m.subject,
          html: m.html,
        });
        await this.audit.log(tx, {
          actorId: actor.id,
          action: 'admin_account.create',
          entity: 'admin_user',
          entityId: u.id,
          tag: 'permission',
          summary: `tạo tài khoản quản trị ${u.name} (${role.name})`,
          ip: actor.ip,
        });
        return u;
      })
      .catch((err: unknown) => {
        // Hai request cùng email: UQ admin_users.email chặn bản thứ hai
        if (isUniqueViolation(err)) throw emailConflict(ADMIN_RBAC_ERRORS.emailAdminTaken);
        throw err;
      });
    return toRow(created, false);
  }
}
