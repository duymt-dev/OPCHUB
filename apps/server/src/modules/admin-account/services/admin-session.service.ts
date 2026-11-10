import { Injectable } from '@nestjs/common';
import type { SystemRole } from '@opchub/shared';
import type { AdminLoginResponse, AdminMe } from '@opchub/shared/api';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { AccessTokenService, type AccessClaimsInput, AuthStateService } from '@/common/auth';
import { unauthorized } from '@/common/errors';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AppSettingsService } from '@/modules/settings';
import { AdminRefreshTokenRepository } from '../repositories/admin-refresh-token.repository';
import type { AdminUserRepository } from '../repositories/admin-user.repository';
import { RoleGrantsService } from './role-grants.service';

export type AdminSessionRow = NonNullable<Awaited<ReturnType<AdminUserRepository['findSession']>>>;

export interface AdminClient {
  ip: string | null;
  userAgent: string | null;
}

export interface AdminSessionResult {
  body: AdminLoginResponse;
  refreshToken: string;
  refreshExpiresAt: Date;
  persistent: boolean;
}

/** D-34 như Portal: ghi nhớ 30 ngày, không ghi nhớ 7 ngày (cookie phiên) */
export const ADMIN_REFRESH_DAYS = { remember: 30, session: 7 } as const;

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

/** Claim `systemRole` bắt buộc của access token (không dùng để phân quyền — guard đọc khoá §21) */
const legacyRole = (key: string | null | undefined): SystemRole =>
  key === 'super_admin' ? 'super_admin' : key === 'admin' ? 'admin' : 'moderator';

/**
 * Phiên realm `admin` (TIP-V2-202, D-62): access JWT có `realm`, `roleId`, `restricted`; refresh
 * token lưu sha256 ở `admin_refresh_tokens`, xoay vòng như phiên thành viên.
 * Phiên hạn chế: còn mật khẩu tạm (SEC-R01) → `password`; "Yêu cầu 2FA" bật mà chưa có (SEC-R02)
 * → `two_factor`. Đổi mật khẩu trước, rồi 2FA.
 */
@Injectable()
export class AdminSessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessTokenService,
    private readonly state: AuthStateService,
    private readonly refresh: AdminRefreshTokenRepository,
    private readonly settings: AppSettingsService,
    private readonly grants: RoleGrantsService,
  ) {}

  async me(a: AdminSessionRow): Promise<AdminMe> {
    const [{ requireAdmin2fa }, permissions] = await Promise.all([
      this.settings.security(),
      a.roleId ? this.grants.grantsOf(a.roleId) : Promise.resolve([]),
    ]);
    return {
      id: a.id,
      name: a.name,
      email: a.email,
      phone: a.phone,
      avatarUrl: a.avatarUrl,
      roleId: a.roleId,
      roleName: a.role?.name ?? null,
      isSuperAdmin: a.role?.key === 'super_admin',
      permissions: [...permissions],
      mustChangePassword: a.mustChangePwd,
      twoFactor: a.totpSecretEnc !== null,
      twoFactorRequired: requireAdmin2fa && a.totpSecretEnc === null,
    };
  }

  async issue(
    a: AdminSessionRow,
    client: AdminClient,
    opts: { days: number; familyId?: string; replacing?: string },
    persistent: boolean,
    now = new Date(),
  ): Promise<AdminSessionResult> {
    const refreshToken = randomBytes(32).toString('base64url');
    const familyId = opts.familyId ?? randomUUID();
    const refreshExpiresAt = new Date(now.getTime() + opts.days * 86_400_000);
    await this.prisma.db.$transaction(async (tx) => {
      const id = await this.refresh.create(tx, {
        adminUserId: a.id,
        familyId,
        tokenHash: sha256(refreshToken),
        expiresAt: refreshExpiresAt,
        userAgent: client.userAgent?.slice(0, 300) ?? null,
        ip: client.ip,
      });
      if (opts.replacing && !(await this.refresh.revokeIfActive(tx, opts.replacing, id, now))) {
        // Hai request xoay cùng token: request thua coi như dùng lại token cũ
        throw unauthorized();
      }
    });
    if ((await this.state.permVersion(a.id, 'admin')) === null) {
      await this.state.setPermVersion(a.id, a.permVersion, 'admin');
    }
    const admin = await this.me(a);
    const role = legacyRole(a.role?.key);
    const claims: AccessClaimsInput = {
      sub: a.id,
      accountType: 'personal',
      systemRole: role,
      permVersion: a.permVersion,
      membershipFee: null,
      mustChangePassword: a.mustChangePwd,
      realm: 'admin',
      roleId: a.roleId,
      roleName: a.role?.name ?? null,
      restricted: a.mustChangePwd ? 'password' : admin.twoFactorRequired ? 'two_factor' : null,
    };
    const accessToken = await this.access.sign(claims, now);
    return {
      body: {
        accessToken,
        admin,
      },
      refreshToken,
      refreshExpiresAt,
      persistent,
    };
  }

  /** Token hợp lệ → bản ghi; token đã thu hồi → thu hồi cả chuỗi (phát hiện dùng lại) rồi 401 */
  async consume(refreshToken: string, now = new Date()) {
    const row = await this.refresh.findByHash(sha256(refreshToken));
    if (!row) throw unauthorized();
    if (row.revokedAt) {
      await this.refresh.revokeFamily(row.familyId, now);
      throw unauthorized('Phiên đăng nhập đã bị thu hồi');
    }
    if (row.expiresAt <= now) throw unauthorized();
    return row;
  }

  async revokeByToken(refreshToken: string, now = new Date()): Promise<string | null> {
    const row = await this.refresh.findByHash(sha256(refreshToken));
    if (!row) return null;
    await this.refresh.revokeFamily(row.familyId, now);
    return row.adminUserId;
  }
}
