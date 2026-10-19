import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { PrismaService } from '@/common/prisma/prisma.service';

/** Tối đa dòng tab "Tài khoản quản trị" (TIP: không phân trang, ≤ 200) */
const LIST_LIMIT = 200;

export const ADMIN_ROW_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  roleId: true,
  status: true,
  totpSecretEnc: true,
  lastLoginAt: true,
  createdAt: true,
  role: { select: { name: true, key: true } },
} as const;

const ADMIN_ROLE_REF = { id: true, name: true, key: true } as const;

/** Cột phiên Admin (claim + `adminMe`) — chỉ select cột cần (query-indexing.md) */
export const ADMIN_SESSION_SELECT = {
  id: true,
  name: true,
  email: true,
  roleId: true,
  status: true,
  mustChangePwd: true,
  permVersion: true,
  totpSecretEnc: true,
  role: { select: ADMIN_ROLE_REF },
} as const;

export interface NewAdminUser {
  name: string;
  email: string;
  phone: string | null;
  roleId: string;
  passwordHash: string;
  createdBy: string;
}

/** Bảng `admin_users` — chỉ domain admin-account đọc/ghi */
@Injectable()
export class AdminUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** TK chưa xoá, cũ → mới (index `admin_users_role_live` không dùng — bảng nhỏ, ≤ 200 dòng) */
  listLive() {
    return this.prisma.db.adminUser.findMany({
      where: { deletedAt: null },
      select: ADMIN_ROW_SELECT,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: LIST_LIMIT,
    });
  }

  /** Email đã thuộc TK quản trị nào chưa (kể cả đã xoá mềm — UQ toàn bảng, citext) */
  async emailExists(email: string): Promise<boolean> {
    const row = await this.prisma.db.adminUser.findUnique({
      where: { email },
      select: { id: true },
    });
    return row !== null;
  }

  /** Phiên Admin: cột cho claim + `adminMe` (UQ email citext; TK đã xoá mềm coi như không có) */
  findSession(id: string) {
    return this.prisma.db.adminUser.findFirst({
      where: { id, deletedAt: null },
      select: ADMIN_SESSION_SELECT,
    });
  }

  findForLogin(email: string) {
    return this.prisma.db.adminUser.findFirst({
      where: { email, deletedAt: null },
      select: { ...ADMIN_SESSION_SELECT, passwordHash: true },
    });
  }

  async findTotpSecret(id: string): Promise<Uint8Array | null> {
    const row = await this.prisma.db.adminUser.findFirst({
      where: { id, deletedAt: null },
      select: { totpSecretEnc: true },
    });
    return row?.totpSecretEnc ?? null;
  }

  async touchLastLogin(id: string, at: Date): Promise<void> {
    await this.prisma.db.adminUser.update({ where: { id }, data: { lastLoginAt: at } });
  }

  /** SEC-R01: chỉ khi còn `must_change_pwd` (cập nhật có điều kiện) → version mới, null nếu đã đổi */
  async setFirstPassword(tx: DbTx, id: string, passwordHash: string): Promise<number | null> {
    const rows = await tx.$queryRaw<{ perm_version: number }[]>`
      UPDATE admin_users SET password_hash = ${passwordHash}, must_change_pwd = false,
        perm_version = perm_version + 1, updated_at = now()
      WHERE id = ${id} AND must_change_pwd AND deleted_at IS NULL
      RETURNING perm_version`;
    return rows[0]?.perm_version ?? null;
  }

  /** QT-02: đặt lại mật khẩu (link mail) — TK còn sống, active → version mới */
  async resetPassword(tx: DbTx, id: string, passwordHash: string): Promise<number | null> {
    const rows = await tx.$queryRaw<{ perm_version: number }[]>`
      UPDATE admin_users SET password_hash = ${passwordHash}, must_change_pwd = false,
        perm_version = perm_version + 1, updated_at = now()
      WHERE id = ${id} AND status = 'active' AND deleted_at IS NULL
      RETURNING perm_version`;
    return rows[0]?.perm_version ?? null;
  }

  /** SEC-R02: bật 2FA chỉ khi chưa bật → version mới (phiên hạn chế phát lại) */
  async enableTotp(tx: DbTx, id: string, secret: Uint8Array): Promise<number | null> {
    const rows = await tx.$queryRaw<{ perm_version: number }[]>`
      UPDATE admin_users SET totp_secret_enc = ${secret}, perm_version = perm_version + 1,
        updated_at = now()
      WHERE id = ${id} AND totp_secret_enc IS NULL AND deleted_at IS NULL
      RETURNING perm_version`;
    return rows[0]?.perm_version ?? null;
  }

  /** Đích thao tác bảo mật (RB-R08): tên, vai trò, trạng thái */
  findTarget(id: string) {
    return this.prisma.db.adminUser.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        name: true,
        status: true,
        roleId: true,
        role: { select: ADMIN_ROLE_REF },
      },
    });
  }

  /** Luật 7: khoá/mở `WHERE status = <from>` (không phải Super Admin) → version mới */
  async transitionStatus(
    tx: DbTx,
    id: string,
    from: 'active' | 'locked',
    to: 'active' | 'locked',
  ): Promise<number | null> {
    const rows = await tx.$queryRaw<{ perm_version: number }[]>`
      UPDATE admin_users a SET status = ${to}::admin_user_status,
        perm_version = a.perm_version + 1, updated_at = now()
      FROM admin_roles r
      WHERE a.id = ${id} AND a.status = ${from}::admin_user_status AND a.deleted_at IS NULL
        AND r.id = a.role_id AND r.key IS DISTINCT FROM 'super_admin'
      RETURNING a.perm_version`;
    return rows[0]?.perm_version ?? null;
  }

  async setRole(tx: DbTx, id: string, roleId: string): Promise<boolean> {
    const r = await tx.adminUser.updateMany({
      where: { id, deletedAt: null },
      data: { roleId },
    });
    return r.count === 1;
  }

  /** Thu hồi = xoá mềm (giữ dòng cho audit_logs.actor_id) → version mới */
  async softDelete(tx: DbTx, id: string): Promise<number | null> {
    const rows = await tx.$queryRaw<{ perm_version: number }[]>`
      UPDATE admin_users SET deleted_at = now(), role_id = NULL, perm_version = perm_version + 1,
        updated_at = now()
      WHERE id = ${id} AND deleted_at IS NULL
      RETURNING perm_version`;
    return rows[0]?.perm_version ?? null;
  }

  create(tx: DbTx, a: NewAdminUser) {
    return tx.adminUser.create({
      data: { ...a, mustChangePwd: true, status: 'active' },
      select: ADMIN_ROW_SELECT,
    });
  }
}
