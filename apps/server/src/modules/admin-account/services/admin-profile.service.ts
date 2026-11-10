import { Injectable } from '@nestjs/common';
import type { AdminChangePasswordRequest, AdminUpdateProfileRequest } from '@opchub/shared/api';
import { AuditService } from '@/common/audit';
import { AppError, conflict, forbidden, unauthorized } from '@/common/errors';
import { OutboxService } from '@/common/outbox';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PasswordService } from '@/modules/account';
import { ImageRefService, MediaGcService } from '@/modules/uploads';
import { AdminProfileRepository } from '../repositories/admin-profile.repository';
import { AdminRefreshTokenRepository } from '../repositories/admin-refresh-token.repository';
import { AdminUserRepository } from '../repositories/admin-user.repository';
import { AdminSessionSyncHandler } from './admin-session-sync.handler';
import { ADMIN_REFRESH_DAYS, AdminSessionService, type AdminClient } from './admin-session.service';

@Injectable()
export class AdminProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: AdminUserRepository,
    private readonly profile: AdminProfileRepository,
    private readonly refresh: AdminRefreshTokenRepository,
    private readonly sessions: AdminSessionService,
    private readonly passwords: PasswordService,
    private readonly images: ImageRefService,
    private readonly gc: MediaGcService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    private readonly sync: AdminSessionSyncHandler,
  ) {}

  async updateProfile(id: string, body: AdminUpdateProfileRequest, client: AdminClient) {
    const row = await this.live(id);
    // External HEAD outside transaction; unchanged legacy avatars remain valid.
    const avatarUrl =
      body.avatarUrl === undefined
        ? row.avatarUrl
        : await this.images.resolve({
            userId: id,
            kind: 'avatar',
            url: body.avatarUrl,
            current: row.avatarUrl,
            path: 'avatarUrl',
          });
    await this.prisma.db.$transaction(async (tx) => {
      // Lock the row before reading the previous avatar, including concurrent profile requests.
      const current = await this.profile.lockAvatar(tx, id);
      const next = body.avatarUrl === undefined ? current.avatarUrl : avatarUrl;
      if (
        !(await this.profile.updateProfile(tx, id, row.permVersion, { ...body, avatarUrl: next }))
      ) {
        throw conflict('Hồ sơ đã thay đổi, vui lòng tải lại');
      }
      await this.gc.enqueueReplaced(tx, current.avatarUrl, next, 'admin-avatar-replaced');
      await this.audit.log(tx, {
        actorId: id,
        action: 'admin_account.update_profile',
        entity: 'admin_user',
        entityId: id,
        tag: 'permission',
        summary: 'cập nhật hồ sơ quản trị cá nhân',
        ip: client.ip,
      });
    });
    return this.sessions.me(await this.live(id));
  }

  async changePassword(
    id: string,
    body: AdminChangePasswordRequest,
    client: AdminClient,
    now = new Date(),
  ) {
    const current = await this.live(id);
    const row = await this.users.findForLogin(current.email);
    if (!row || !(await this.passwords.verify(row.passwordHash, body.currentPassword))) {
      const message = 'Mật khẩu hiện tại không đúng';
      throw new AppError('VALIDATION_ERROR', message, [{ path: 'currentPassword', message }]);
    }
    if (row.mustChangePwd) throw conflict('Vui lòng đổi mật khẩu tạm trước');
    const hash = await this.passwords.hash(body.newPassword);
    await this.prisma.db.$transaction(async (tx) => {
      if ((await this.profile.updatePassword(tx, id, row.passwordHash, hash)) === null) {
        throw conflict('Thông tin bảo mật đã thay đổi, vui lòng thử lại');
      }
      await this.refresh.revokeAllOf(tx, id, now);
      await this.audit.log(tx, {
        actorId: id,
        action: 'admin_account.change_password',
        entity: 'admin_user',
        entityId: id,
        tag: 'permission',
        summary: 'đổi mật khẩu quản trị cá nhân',
        ip: client.ip,
      });
      await this.outbox.add(tx, 'admin.session_changed', { adminId: id });
    });
    await this.sync.sync({ adminId: id });
    return this.sessions.issue(
      await this.live(id),
      client,
      { days: ADMIN_REFRESH_DAYS.session },
      false,
      now,
    );
  }

  private async live(id: string) {
    const row = await this.users.findSession(id);
    if (!row) throw unauthorized();
    if (row.status !== 'active') throw forbidden('Tài khoản quản trị đã bị khóa');
    return row;
  }
}
