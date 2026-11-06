import { Inject, Injectable, Optional } from '@nestjs/common';
import type { LoginRequest, LoginResponse } from '@opchub/shared/api';
import { ACCOUNT_LOCKED_MESSAGE, accountLockedUntilMessage } from '@opchub/shared';
import { AppError, forbidden, unauthorized } from '@/common/errors';
import { LiveCountersService } from '@/common/realtime';
import { parseIdentifier } from '../domain/identifier';
import { toMe, type SessionUser } from '../domain/me.mapper';
import { ADMIN_EMAIL_PORT, type AdminEmailPort, FEE_READER, type FeeReader } from '../ports';
import { UserRepository } from '../repositories/user.repository';
import { AccountLockService } from './account-lock.service';
import { LoginLockService } from './login-lock.service';
import { PasswordService } from './password.service';
import { MFA_REQUIRED, TotpService } from './totp.service';
import { type ClientInfo, REFRESH_DAYS, TokenService } from './token.service';

export interface SessionResult {
  body: LoginResponse;
  refreshToken: string;
  refreshExpiresAt: Date;
  /** false = cookie phiên (D-34 không ghi nhớ) */
  persistent: boolean;
}

const BAD_CREDENTIALS = 'Email hoặc mật khẩu không đúng';
export const WRONG_PORTAL_MESSAGE = 'Tài khoản này đăng nhập ở cổng khác';
export const LOCKED_MESSAGE = ACCOUNT_LOCKED_MESSAGE;

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly passwords: PasswordService,
    private readonly lock: LoginLockService,
    private readonly tokens: TokenService,
    private readonly totp: TotpService,
    @Inject(FEE_READER) private readonly fees: FeeReader,
    private readonly live: LiveCountersService,
    private readonly accountLock: AccountLockService,
    @Optional() @Inject(ADMIN_EMAIL_PORT) private readonly admins: AdminEmailPort | null = null,
  ) {}

  async login(req: LoginRequest, client: ClientInfo, now = new Date()): Promise<SessionResult> {
    const ip = client.ip ?? 'unknown';
    const key = req.identifier.trim().toLowerCase();
    await this.lock.assertNotLocked(key, ip);

    const id = parseIdentifier(req.identifier);
    const user = id ? await this.users.findForLogin(id) : null;
    const ok = await this.passwords.verify(user?.passwordHash ?? null, req.password);
    if (!user || !ok) {
      // NA-01, D-62: TK quản trị đăng nhập ở cổng Admin — chỉ lộ khi mật khẩu đúng (BR-02)
      if (
        !user &&
        id?.kind === 'email' &&
        (await this.admins?.adminPasswordMatches(id.email, req.password))
      ) {
        await this.lock.reset(key, ip);
        throw new AppError('WRONG_PORTAL', WRONG_PORTAL_MESSAGE);
      }
      await this.lock.recordFailure(key, ip);
      throw new AppError('UNAUTHORIZED', BAD_CREDENTIALS);
    }
    // BR-02: chỉ báo bị khoá khi mật khẩu đúng (không lộ trạng thái cho người đoán)
    await this.assertUnlocked(user, now);
    await this.lock.reset(key, ip);
    const persistent = req.remember === true;
    if (user.totpSecretEnc) {
      // D-27 bước 2: chưa phát phiên; client gửi mfaToken + mã tới /auth/totp/verify
      const mfaToken = await this.totp.challenge(user.id, persistent);
      throw new AppError('UNAUTHORIZED', MFA_REQUIRED, [{ path: 'mfaToken', message: mfaToken }]);
    }
    await this.loggedIn(user, now);

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
    await this.assertUnlocked(user, now);
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

  /** Bước 2 đăng nhập TOTP → phiên */
  async completeMfa(
    mfaToken: string,
    code: string,
    client: ClientInfo,
    now = new Date(),
  ): Promise<SessionResult> {
    const { userId, remember } = await this.totp.complete(mfaToken, code, now);
    const user = await this.users.findSession(userId);
    if (!user) throw unauthorized();
    await this.assertUnlocked(user, now);
    await this.loggedIn(user, now);
    const days = remember ? REFRESH_DAYS.remember : REFRESH_DAYS.session;
    return this.startSession(user, client, { days }, remember, now);
  }

  /**
   * V4-612 (§26.6): khoá có hạn đã hết → tự mở rồi cho vào; còn hạn → 403 báo ngày mở khoá;
   * khoá không hạn giữ câu NA-16.
   */
  private async assertUnlocked(user: SessionUser, now: Date): Promise<void> {
    if (user.status !== 'locked') return;
    if (await this.accountLock.unlockIfExpired(user, now)) {
      // Unlock updates status and permission version. Never issue a new session
      // from the pre-unlock projection (which still describes a locked account).
      const current = await this.users.findSession(user.id);
      if (!current) throw unauthorized();
      Object.assign(user, current);
      return;
    }
    throw forbidden(
      user.lockedUntil ? accountLockedUntilMessage(user.lockedUntil) : LOCKED_MESSAGE,
    );
  }

  logout(refreshToken: string | undefined, now = new Date()): Promise<void> {
    return refreshToken ? this.tokens.revokeByToken(refreshToken, now) : Promise.resolve();
  }

  /** Phiên mới cho TK vừa xác thực (đăng nhập, kích hoạt OTP, SSO) */
  async startSession(
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

  /** Ghi lần đăng nhập + mục "đăng nhập" ở hoạt động trực tiếp Dashboard (NA-24) */
  private async loggedIn(user: SessionUser, now: Date): Promise<void> {
    await this.users.touchLastLogin(user.id, now);
    const actor = { name: user.fullName, avatarUrl: user.avatarUrl };
    await this.live
      .record('login', actor, '', `${user.id}:${now.getTime()}`, now)
      .catch(() => undefined);
  }
}
