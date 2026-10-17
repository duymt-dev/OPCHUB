import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { PrismaService } from '@/common/prisma/prisma.service';

export interface NewRefreshToken {
  userId: string;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
  userAgent: string | null;
  ip: string | null;
}

@Injectable()
export class RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(tx: DbTx, t: NewRefreshToken): Promise<string> {
    const row = await tx.refreshToken.create({ data: t, select: { id: true } });
    return row.id;
  }

  /** UQ token_hash */
  findByHash(tokenHash: string) {
    return this.prisma.db.refreshToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, familyId: true, expiresAt: true, revokedAt: true },
    });
  }

  /** Thu hồi có điều kiện: 0 dòng = token đã bị dùng (đua nhau xoay vòng) */
  async revokeIfActive(
    tx: DbTx,
    id: string,
    replacedBy: string | null,
    at: Date,
  ): Promise<boolean> {
    const r = await tx.refreshToken.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: at, replacedBy },
    });
    return r.count === 1;
  }

  async revokeFamily(familyId: string, at: Date): Promise<void> {
    await this.prisma.db.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: at },
    });
  }

  /** Đổi mật khẩu / khoá TK / đăng xuất thiết bị khác (B12, B15) */
  async revokeAllOfUser(userId: string, at: Date, exceptFamilyId?: string): Promise<void> {
    await this.prisma.db.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(exceptFamilyId ? { familyId: { not: exceptFamilyId } } : {}),
      },
      data: { revokedAt: at },
    });
  }

  /** Khoá hàng loạt: thu hồi mọi chuỗi của các user trong một câu */
  async revokeAllOfUsers(userIds: readonly string[], at: Date): Promise<void> {
    if (!userIds.length) return;
    await this.prisma.db.refreshToken.updateMany({
      where: { userId: { in: [...userIds] }, revokedAt: null },
      data: { revokedAt: at },
    });
  }
}
