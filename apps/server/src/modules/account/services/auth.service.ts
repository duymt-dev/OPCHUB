import { Inject, Injectable } from '@nestjs/common';
import type { LoginRequest, LoginResponse } from '@opchub/shared/api';
import { AppError, forbidden, unauthorized } from '@/common/errors';
import { parseIdentifier } from '../domain/identifier';
import { toMe, type SessionUser } from '../domain/me.mapper';
import { FEE_READER, type FeeReader } from '../ports';
import { UserRepository } from '../repositories/user.repository';
import { LoginLockService } from './login-lock.service';
import { PasswordService } from './password.service';
import { type ClientInfo, REFRESH_DAYS, TokenService } from './token.service';

export interface SessionResult {
  body: LoginResponse;
  refreshToken: string;
  refreshExpiresAt: Date;
  /** false = cookie phiên (D-34 không ghi nhớ) */
  persistent: boolean;
}

const BAD_CREDENTIALS = 'Email hoặc mật khẩu không đúng';
export const LOCKED_MESSAGE = 'Tài khoản đã bị khóa, liên hệ hỗ trợ';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly passwords: PasswordService,
    private readonly lock: LoginLockService,
    private readonly tokens: TokenService,
    @Inject(FEE_READER) private readonly fees: FeeReader,
  ) {}

  async login(req: LoginRequest, client: ClientInfo, now = new Date()): Promise<SessionResult> {
    const ip = client.ip ?? 'unknown';
    const key = req.identifier.trim().toLowerCase();
    await this.lock.assertNotLocked(key, ip);

    const id = parseIdentifier(req.identifier);
    const user = id ? await this.users.findForLogin(id) : null;
    const ok = await this.passwords.verify(user?.passwordHash ?? null, req.password);
    if (!user || !ok) {
      await this.lock.recordFailure(key, ip);
      throw new AppError('UNAUTHORIZED', BAD_CREDENTIALS);
    }
    // BR-02: chỉ báo bị khoá khi mật khẩu đúng (không lộ trạng thái cho người đoán)
    if (user.status === 'locked') throw forbidden(LOCKED_MESSAGE);
    await this.lock.reset(key, ip);
    await this.users.touchLastLogin(user.id, now);

    const persistent = req.remember === true;
    const days = persistent ? REFRESH_DAYS.remember : REFRESH_DAYS.session;
    return this.startSession(user, client, { days }, persistent, now);
  }

  async refresh(
    refreshToken: string,
    client: ClientInfo,
    now = new Date(),
  ): Promise<SessionResult> {
    const row = await this.tokens.consume(refreshToken, now);
    const user = await this.users.findSession(row.userId);
    if (!user) throw unauthorized();
    if (user.status === 'locked') throw forbidden(LOCKED_MESSAGE);
    // Giữ nguyên thời hạn của chuỗi: token mới hết hạn cùng lúc token cũ
    const days = Math.max(1, Math.ceil((row.expiresAt.getTime() - now.getTime()) / 86_400_000));
    const persistent = days > REFRESH_DAYS.session;
    return this.startSession(
      user,
      client,
      { days, familyId: row.familyId, replacing: row.id },
      persistent,
      now,
    );
  }

  logout(refreshToken: string | undefined, now = new Date()): Promise<void> {
    return refreshToken ? this.tokens.revokeByToken(refreshToken, now) : Promise.resolve();
  }

  private async startSession(
    user: SessionUser,
    client: ClientInfo,
    opts: { days: number; familyId?: string; replacing?: string },
    persistent: boolean,
    now: Date,
  ): Promise<SessionResult> {
    const fee = await this.fees.feeOf(user.id);
    const s = await this.tokens.issue(user, fee, client, opts, now);
    return {
      body: { accessToken: s.accessToken, me: toMe(user, fee) },
      refreshToken: s.refreshToken,
      refreshExpiresAt: s.refreshExpiresAt,
      persistent,
    };
  }
}
