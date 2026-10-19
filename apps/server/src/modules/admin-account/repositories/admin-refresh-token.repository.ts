import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { PrismaService } from '@/common/prisma/prisma.service';

export interface NewAdminRefreshToken {
  adminUserId: string;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
  userAgent: string | null;
  ip: string | null;
}

/** Bảng `admin_refresh_tokens` — cùng luật xoay vòng với `refresh_tokens` (auth-rbac.md) */
@Injectable()
export class AdminRefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(tx: DbTx, t: NewAdminRefreshToken): Promise<string> {
    const row = await tx.adminRefreshToken.create({ data: t, select: { id: true } });
    return row.id;
  }

  /** UQ token_hash */
  findByHash(tokenHash: string) {
    return this.prisma.db.adminRefreshToken.findUnique({
      where: { tokenHash },
      select: { id: true, adminUserId: true, familyId: true, expiresAt: true, revokedAt: true },
    });
  }

  /** Thu hồi có điều kiện: 0 dòng = token đã bị dùng (đua nhau xoay vòng) */
  async revokeIfActive(tx: DbTx, id: string, replacedBy: string, at: Date): Promise<boolean> {
    const r = await tx.adminRefreshToken.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: at, replacedBy },
    });
    return r.count === 1;
  }

  async revokeFamily(familyId: string, at: Date): Promise<void> {
    await this.prisma.db.adminRefreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: at },
    });
  }

  /** Khoá / thu hồi / đổi mật khẩu: mọi chuỗi của TK (index admin_user_id, revoked_at) */
  async revokeAllOf(tx: DbTx, adminUserId: string, at: Date, exceptFamilyId?: string) {
    await tx.adminRefreshToken.updateMany({
      where: {
        adminUserId,
        revokedAt: null,
        ...(exceptFamilyId ? { familyId: { not: exceptFamilyId } } : {}),
      },
      data: { revokedAt: at },
    });
  }
}
