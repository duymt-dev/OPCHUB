import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import {
  ADMIN_AUTH_MESSAGES as MSG,
  type AdminFirstPasswordRequest,
  type AdminTwoFactorSetup,
  isStrongAdminPassword,
  type LoginRequest,
} from '@opchub/shared/api';
import { AuditService } from '@/common/audit';
import { AuthStateService } from '@/common/auth';
import { AppError, forbidden, unauthorized } from '@/common/errors';
import { PrismaService } from '@/common/prisma/prisma.service';
import { LoginLockService, PasswordService, PortalCredentials } from '@/modules/account';
import { AdminRefreshTokenRepository } from '../repositories/admin-refresh-token.repository';
import { AdminUserRepository } from '../repositories/admin-user.repository';
import { AdminMfaService } from './admin-mfa.service';
import {
  type AdminClient,
  ADMIN_REFRESH_DAYS,
  type AdminSessionResult,
  type AdminSessionRow,
  AdminSessionService,
} from './admin-session.service';

const field = (path: string, message: string) =>
  new AppError('VALIDATION_ERROR', message, [{ path, message }]);

/**
 * Đăng nhập Admin (TIP-V2-202): chỉ tra `admin_users` (realm `admin`, D-62). NA-15 khoá tạm theo
 * `admin:<email>|ip`; BR-02 chỉ lộ "bị khoá" / "sai cổng" khi mật khẩu đúng; D-27 bước mã 6 số.
 * SEC-R01 đổi mật khẩu tạm, SEC-R02 bật 2FA — mỗi bước phát phiên mới (version tăng).
 */
@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: AdminUserRepository,
    private readonly refresh: AdminRefreshTokenRepository,
    private readonly passwords: PasswordService,
    private readonly lock: LoginLockService,
    private readonly portal: PortalCredentials,
    private readonly sessions: AdminSessionService,
    private readonly mfa: AdminMfaService,
    private readonly state: AuthStateService,
    private readonly audit: AuditService,
  ) {}

  async login(req: LoginRequest, client: AdminClient, now = new Date()) {
    const ip = client.ip ?? 'unknown';
    const email = req.identifier.trim().toLowerCase();
    const key = `admin:${email}`;
    await this.lock.assertNotLocked(key, ip);
    const row = await this.users.findForLogin(email);
    const ok = await this.passwords.verify(row?.passwordHash ?? null, req.password);
    if (!row || !ok) {
      if (!row && (await this.portal.memberPasswordMatches(req.identifier, req.password))) {
        await this.lock.reset(key, ip);
        throw new AppError('WRONG_PORTAL', MSG.wrongPortal);
      }
      await this.lock.recordFailure(key, ip);
      throw new AppError('UNAUTHORIZED', MSG.badCredentials);
    }
    if (row.status === 'locked') throw forbidden(MSG.locked);
    await this.lock.reset(key, ip);
    const persistent = req.remember === true;
    if (row.totpSecretEnc) {
      // D-27 bước 2: chưa phát phiên; client gửi mfaToken + mã tới /admin/auth/totp/verify
      const mfaToken = await this.mfa.challenge(row.id, persistent);
      throw new AppError('UNAUTHORIZED', 'Cần mã xác thực 2 lớp', [
        { path: 'mfaToken', message: mfaToken },
      ]);
    }
    return this.begin(row, client, persistent, now);
  }

  async completeMfa(mfaToken: string, code: string, client: AdminClient, now = new Date()) {
    const { adminId, remember } = await this.mfa.complete(mfaToken, code, now);
    const row = await this.live(adminId);
    return this.begin(row, client, remember, now);
  }

  async refreshSession(token: string, client: AdminClient, now = new Date()) {
    const t = await this.sessions.consume(token, now);
    const row = await this.live(t.adminUserId);
    // Giữ nguyên thời hạn của chuỗi: token mới hết hạn cùng lúc token cũ
    const days = Math.max(1, Math.ceil((t.expiresAt.getTime() - now.getTime()) / 86_400_000));
    const opts = { days, familyId: t.familyId, replacing: t.id };
    return this.sessions.issue(row, client, opts, days > ADMIN_REFRESH_DAYS.session, now);
  }

  async logout(token: string | undefined, ip: string | null, now = new Date()): Promise<void> {
    const adminId = token ? await this.sessions.revokeByToken(token, now) : null;
    if (adminId) await this.log(adminId, 'admin_auth.logout', 'đăng xuất Admin', ip);
  }

  async me(adminId: string) {
    return this.sessions.me(await this.live(adminId));
  }

  /**
   * SEC-R01 (AT-SEC01): ≥ 8 ký tự, có chữ hoa và chữ số, nhập lại khớp, khác mật khẩu tạm. Lưu →
   * `must_change_pwd=false`, version mới, thu hồi mọi chuỗi refresh, phát phiên mới.
   */
  async firstPassword(
    adminId: string,
    body: AdminFirstPasswordRequest,
    client: AdminClient,
    now = new Date(),
  ): Promise<AdminSessionResult> {
    if (!isStrongAdminPassword(body.newPassword)) throw field('newPassword', MSG.weakPassword);
    if (body.newPassword !== body.confirmPassword) throw field('confirmPassword', MSG.mismatch);
    const current = await this.live(adminId);
    const row = await this.users.findForLogin(current.email);
    if (!row?.mustChangePwd) throw new AppError('CONFLICT', MSG.notChangeRequired);
    if (await this.passwords.verify(row.passwordHash, body.newPassword)) {
      throw field('newPassword', MSG.sameAsTemp);
    }
    const hash = await this.passwords.hash(body.newPassword);
    await this.bump(
      adminId,
      client,
      now,
      'admin_account.first_password',
      'đổi mật khẩu tạm lần đầu',
      (tx) => this.users.setFirstPassword(tx, adminId, hash),
    );
    return this.reissue(adminId, client, now);
  }

  async setupTwoFactor(adminId: string): Promise<AdminTwoFactorSetup> {
    const row = await this.live(adminId);
    if (row.totpSecretEnc) throw new AppError('CONFLICT', MSG.twoFactorEnabled);
    return this.mfa.setup(row.id, row.email);
  }

  /** SEC-R02, BUG-015: mã đúng → bật 2FA, phiên mới hết hạn chế */
  async enableTwoFactor(adminId: string, code: string, client: AdminClient, now = new Date()) {
    const secret = await this.mfa.confirmSetup(adminId, code, now);
    await this.bump(
      adminId,
      client,
      now,
      'admin_account.two_factor_enable',
      'bật xác thực 2 lớp',
      (tx) => this.users.enableTotp(tx, adminId, secret),
    );
    return this.reissue(adminId, client, now);
  }

  private async live(adminId: string): Promise<AdminSessionRow> {
    const row = await this.users.findSession(adminId);
    if (!row) throw unauthorized();
    if (row.status === 'locked') throw forbidden(MSG.locked);
    return row;
  }

  /** Ghi thay đổi (điều kiện) + thu hồi refresh + audit một transaction; Redis version sau commit */
  private async bump(
    adminId: string,
    client: AdminClient,
    now: Date,
    action: string,
    summary: string,
    write: (tx: DbTx) => Promise<number | null>,
  ): Promise<void> {
    const version = await this.prisma.db.$transaction(async (tx) => {
      const v = await write(tx);
      if (v === null) throw new AppError('CONFLICT', MSG.notChangeRequired);
      await this.refresh.revokeAllOf(tx, adminId, now);
      await this.audit.log(tx, {
        actorId: adminId,
        action,
        entity: 'admin_user',
        entityId: adminId,
        tag: 'permission',
        summary,
        ip: client.ip,
      });
      return v;
    });
    await this.state.setPermVersion(adminId, version, 'admin');
  }

  private async reissue(adminId: string, client: AdminClient, now: Date) {
    const row = await this.live(adminId);
    return this.sessions.issue(row, client, { days: ADMIN_REFRESH_DAYS.session }, false, now);
  }

  private async begin(row: AdminSessionRow, client: AdminClient, persistent: boolean, now: Date) {
    await this.users.touchLastLogin(row.id, now);
    await this.log(row.id, 'admin_auth.login', 'đăng nhập Admin', client.ip);
    const days = persistent ? ADMIN_REFRESH_DAYS.remember : ADMIN_REFRESH_DAYS.session;
    return this.sessions.issue(row, client, { days }, persistent, now);
  }

  /** NA-01: audit đăng nhập / đăng xuất Admin */
  private async log(adminId: string, action: string, summary: string, ip: string | null) {
    await this.prisma.db.$transaction((tx) =>
      this.audit.log(tx, {
        actorId: adminId,
        action,
        entity: 'admin_user',
        entityId: adminId,
        tag: 'permission',
        summary,
        ip,
      }),
    );
  }
}
