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

  /**
   * NA-13: xoá token hết hạn / thu hồi quá 7 ngày theo lô (≤ 5.000 dòng/lệnh, lặp tới hết) —
   * idx (expires_at) + (…, revoked_at). Trả số dòng đã xoá.
   */
  async purgeExpired(before: Date): Promise<number> {
    let total = 0;
    for (;;) {
      const n = await this.prisma.db.$executeRaw`
        DELETE FROM admin_refresh_tokens WHERE id IN (
          SELECT id FROM admin_refresh_tokens WHERE expires_at < ${before} OR revoked_at < ${before} LIMIT 5000
        )`;
      total += n;
      if (n < 5000) return total;
    }
  }
}
