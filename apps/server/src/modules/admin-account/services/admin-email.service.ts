import { Injectable } from '@nestjs/common';
import { AuthStateService } from '@/common/auth';
import { PrismaService } from '@/common/prisma/prisma.service';
import type { AdminEmailPort } from '@/modules/account';
import { PasswordService } from '@/modules/account';
import { AdminRefreshTokenRepository } from '../repositories/admin-refresh-token.repository';
import { AdminUserRepository } from '../repositories/admin-user.repository';

/**
 * Hiện thực `ADMIN_EMAIL_PORT` cho account (account không import ngược admin-account):
 * RB-R03 email TK quản trị không dùng cho thành viên, D-62 sai cổng, QT-02 đặt lại mật khẩu Admin.
 */
@Injectable()
export class AdminEmailService implements AdminEmailPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: AdminUserRepository,
    private readonly refresh: AdminRefreshTokenRepository,
    private readonly passwords: PasswordService,
    private readonly state: AuthStateService,
  ) {}

  isAdminEmail(email: string): Promise<boolean> {
    return this.users.emailExists(email.trim().toLowerCase());
  }

  async adminPasswordMatches(email: string, password: string): Promise<boolean> {
    const row = await this.users.findForLogin(email.trim().toLowerCase());
    return row !== null && (await this.passwords.verify(row.passwordHash, password));
  }

  async adminForReset(email: string): Promise<{ id: string; email: string } | null> {
    const row = await this.users.findForLogin(email.trim().toLowerCase());
    return row?.status === 'active' ? { id: row.id, email: row.email } : null;
  }

  async setAdminPassword(adminId: string, passwordHash: string, now: Date): Promise<void> {
    const version = await this.prisma.db.$transaction(async (tx) => {
      const v = await this.users.resetPassword(tx, adminId, passwordHash);
      if (v !== null) await this.refresh.revokeAllOf(tx, adminId, now);
      return v;
    });
    if (version !== null) await this.state.setPermVersion(adminId, version, 'admin');
  }
}
