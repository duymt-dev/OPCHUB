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

  create(tx: DbTx, a: NewAdminUser) {
    return tx.adminUser.create({
      data: { ...a, mustChangePwd: true, status: 'active' },
      select: ADMIN_ROW_SELECT,
    });
  }
}
