import { Injectable } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { AccessTokenService, AuthStateService } from '@/common/auth';
import { unauthorized } from '@/common/errors';
import { PrismaService } from '@/common/prisma/prisma.service';
import type { FeeSnapshot } from '../ports';
import { type SessionUser, toClaims } from '../domain/me.mapper';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';

/** D-34: ghi nhớ → 30 ngày; không → 7 ngày (cookie phiên) */
export const REFRESH_DAYS = { remember: 30, session: 7 } as const;

export interface ClientInfo {
  ip: string | null;
  userAgent: string | null;
}

export interface IssuedSession {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
  familyId: string;
}

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

/** Refresh token: 32 byte ngẫu nhiên, chỉ lưu sha256; xoay vòng mỗi lần dùng (auth-rbac.md) */
@Injectable()
export class TokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessTokenService,
    private readonly state: AuthStateService,
    private readonly refreshRepo: RefreshTokenRepository,
  ) {}

  async issue(
    user: SessionUser,
    fee: FeeSnapshot | null,
    client: ClientInfo,
    opts: { familyId?: string; days: number; replacing?: string },
    now = new Date(),
  ): Promise<IssuedSession> {
    const refreshToken = randomBytes(32).toString('base64url');
    const familyId = opts.familyId ?? randomUUID();
    const refreshExpiresAt = new Date(now.getTime() + opts.days * 86_400_000);
    await this.prisma.db.$transaction(async (tx) => {
      const id = await this.refreshRepo.create(tx, {
        userId: user.id,
        familyId,
        tokenHash: sha256(refreshToken),
        expiresAt: refreshExpiresAt,
        userAgent: client.userAgent?.slice(0, 300) ?? null,
        ip: client.ip,
      });
      if (opts.replacing) {
        const ok = await this.refreshRepo.revokeIfActive(tx, opts.replacing, id, now);
        // Hai request xoay cùng token: request thua coi như dùng lại token cũ
        if (!ok) throw unauthorized();
      }
    });
    // Đồng bộ version phiên cho guard (S-03) nếu Redis chưa có
    if ((await this.state.permVersion(user.id)) === null) {
      await this.state.setPermVersion(user.id, user.permVersion);
    }
    const accessToken = await this.access.sign(toClaims(user, fee), now);
    return { accessToken, refreshToken, refreshExpiresAt, familyId };
  }

  /** Token hợp lệ → bản ghi; token đã thu hồi → thu hồi cả chuỗi (phát hiện dùng lại) rồi 401 */
  async consume(refreshToken: string, now = new Date()) {
    const row = await this.refreshRepo.findByHash(sha256(refreshToken));
    if (!row) throw unauthorized();
    if (row.revokedAt) {
      await this.refreshRepo.revokeFamily(row.familyId, now);
      throw unauthorized('Phiên đăng nhập đã bị thu hồi');
    }
    if (row.expiresAt <= now) throw unauthorized();
    return row;
  }

  async revokeByToken(refreshToken: string, now = new Date()): Promise<void> {
    const row = await this.refreshRepo.findByHash(sha256(refreshToken));
    if (row) await this.refreshRepo.revokeFamily(row.familyId, now);
  }
}
