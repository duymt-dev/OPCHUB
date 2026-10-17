import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PROFILE_MESSAGES } from '@opchub/shared/api-domains';
import { AppError, unauthorized } from '@/common/errors';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CredentialRepository } from '../repositories/credential.repository';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { PasswordPolicyService } from './password-policy.service';
import { PasswordResetService } from './password-reset.service';
import { PasswordService } from './password.service';

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

/** Màn Hồ sơ › Bảo mật: đổi mật khẩu, đăng xuất thiết bị khác (Q-G3c-1) */
@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly creds: CredentialRepository,
    private readonly refresh: RefreshTokenRepository,
    private readonly passwords: PasswordService,
    private readonly policy: PasswordPolicyService,
    private readonly reset: PasswordResetService,
  ) {}

  /** Chuỗi refresh của thiết bị đang gọi (cookie) — giữ lại khi đổi mật khẩu / thu hồi */
  private async currentFamily(userId: string, refreshToken: string | undefined) {
    if (!refreshToken) return undefined;
    const row = await this.refresh.findByHash(sha256(refreshToken));
    return row && row.userId === userId && !row.revokedAt ? row.familyId : undefined;
  }

  async changePassword(
    userId: string,
    current: string,
    next: string,
    refreshToken: string | undefined,
    now = new Date(),
  ): Promise<void> {
    const row = await this.creds.findPasswordHash(userId);
    if (!row) throw unauthorized();
    if (!(await this.passwords.verify(row.passwordHash, current))) {
      throw new AppError('VALIDATION_ERROR', PROFILE_MESSAGES.currentWrong, [
        { path: 'currentPassword', message: PROFILE_MESSAGES.currentWrong },
      ]);
    }
    const hash = await this.policy.hashChecked(next, 'newPassword');
    await this.reset.apply(userId, hash, now, await this.currentFamily(userId, refreshToken));
  }

  /** Thu hồi mọi chuỗi refresh trừ thiết bị hiện tại; trả số chuỗi bị thu hồi */
  async revokeOthers(
    userId: string,
    refreshToken: string | undefined,
    now = new Date(),
  ): Promise<number> {
    const keep = await this.currentFamily(userId, refreshToken);
    const families = await this.prisma.db.refreshToken.findMany({
      where: { userId, revokedAt: null, ...(keep ? { familyId: { not: keep } } : {}) },
      select: { familyId: true },
      distinct: ['familyId'],
    });
    await this.refresh.revokeAllOfUser(userId, now, keep);
    return families.length;
  }
}
