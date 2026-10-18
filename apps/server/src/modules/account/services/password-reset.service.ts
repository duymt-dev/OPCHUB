import { Inject, Injectable } from '@nestjs/common';
import { PASSWORD_RESET_INVALID_MESSAGE } from '@opchub/shared';
import { createHash, randomBytes } from 'node:crypto';
import { AuthStateService } from '@/common/auth';
import { ENV, type Env } from '@/common/config';
import { AppError } from '@/common/errors';
import { OutboxService } from '@/common/outbox';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { MailService } from '@/modules/mail';
import { CredentialRepository } from '../repositories/credential.repository';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { PasswordPolicyService } from './password-policy.service';

const TOKEN_TTL_SEC = 15 * 60;
const MAX_PER_HOUR = 3;
const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');
const tokenKey = (token: string) => `pwreset:${sha256(token)}`;
const rateKey = (email: string) => `pwreset:rate:${sha256(email)}`;

export const RESET_INVALID = PASSWORD_RESET_INVALID_MESSAGE;

/**
 * Quên / đặt lại mật khẩu (auth-rbac.md, D-10): token 32 byte chỉ lưu sha256 trong Redis 15',
 * dùng một lần; không lộ email có TK hay không; không gửi mật khẩu qua mail.
 */
@Injectable()
export class PasswordResetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly creds: CredentialRepository,
    private readonly refresh: RefreshTokenRepository,
    private readonly policy: PasswordPolicyService,
    private readonly state: AuthStateService,
    private readonly mail: MailService,
    private readonly outbox: OutboxService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /** Luôn thành công với caller (204) — chỉ gửi khi TK tồn tại và chưa vượt 3 lần/giờ */
  async forgot(rawEmail: string): Promise<void> {
    const email = rawEmail.trim().toLowerCase();
    const n = await this.redis.client.incr(rateKey(email));
    if (n === 1) await this.redis.client.expire(rateKey(email), 3600);
    if (n > MAX_PER_HOUR) return;
    const user = await this.creds.findByEmail(email);
    if (!user) return;

    const token = randomBytes(32).toString('base64url');
    await this.redis.client.set(tokenKey(token), user.id, 'EX', TOKEN_TTL_SEC);
    const link = `${this.resetBaseUrl(user.systemRole)}/reset-password?token=${token}`;
    await this.prisma.db.$transaction((tx) =>
      this.mail.request(tx, {
        to: user.email,
        kind: 'password_reset',
        subject: 'Đặt lại mật khẩu OPC Hub',
        html:
          `<p>Xin chào,</p><p>Bấm vào liên kết dưới đây để đặt mật khẩu mới (hiệu lực 15 phút):</p>` +
          `<p><a href="${link}">Đặt lại mật khẩu</a></p>` +
          `<p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>`,
      }),
    );
  }

  /**
   * BUG-001, D-62: TK quản trị đặt lại ở Admin, thành viên ở Portal.
   * Sau TIP-V2-201 (bảng `admin_users`) đổi điều kiện theo bảng đó.
   */
  private resetBaseUrl(systemRole: string): string {
    return systemRole === 'member' ? this.env.PORTAL_URL : this.env.ADMIN_URL;
  }

  async reset(token: string, newPassword: string, now = new Date()): Promise<void> {
    // V2Q-68: kiểm độ mạnh trước — mật khẩu yếu không làm mất link (người dùng sửa ô rồi gửi lại)
    const hash = await this.policy.hashChecked(newPassword, 'newPassword');
    // GETDEL: dùng một lần kể cả khi hai request đến cùng lúc
    const userId = await this.redis.client.getdel(tokenKey(token));
    if (!userId) throw new AppError('VALIDATION_ERROR', RESET_INVALID);
    await this.apply(userId, hash, now);
  }

  /** Đổi hash + bump version + outbox thu hồi phiên; `keepFamilyId` = giữ thiết bị đang dùng */
  async apply(userId: string, hash: string, now: Date, keepFamilyId?: string): Promise<void> {
    const version = await this.prisma.db.$transaction(async (tx) => {
      const v = await this.creds.setPassword(tx, userId, hash);
      await this.outbox.add(tx, 'user.session_revoked', { userId, reason: 'password_changed' });
      return v;
    });
    await this.state.setPermVersion(userId, version);
    await this.refresh.revokeAllOfUser(userId, now, keepFamilyId);
  }
}
