import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { PrismaService } from '@/common/prisma/prisma.service';

/** Mật khẩu + TOTP của user (tách khỏi UserRepository để giữ file nhỏ) */
@Injectable()
export class CredentialRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.db.user.findFirst({
      where: { email, deletedAt: null, status: 'active' },
      select: { id: true, email: true, fullName: true, systemRole: true },
    });
  }

  findPasswordHash(userId: string) {
    return this.prisma.db.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { passwordHash: true },
    });
  }

  findTotpSecret(userId: string) {
    return this.prisma.db.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { totpSecretEnc: true },
    });
  }

  /** Đổi hash + tăng perm_version (token cũ hết hiệu lực, S-03); trả version mới */
  async setPassword(tx: DbTx, userId: string, passwordHash: string): Promise<number> {
    const u = await tx.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: false, permVersion: { increment: 1 } },
      select: { permVersion: true },
    });
    return u.permVersion;
  }

  async setTotpSecret(userId: string, enc: Uint8Array<ArrayBuffer> | null): Promise<void> {
    await this.prisma.db.user.update({ where: { id: userId }, data: { totpSecretEnc: enc } });
  }
}
