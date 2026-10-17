import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import type { SessionUser } from '../domain/me.mapper';
import type { LoginIdentifier } from '../domain/identifier';

/** Cột cho phiên đăng nhập — chỉ select cột cần (query-indexing.md) */
export const SESSION_SELECT = {
  id: true,
  memberCode: true,
  fullName: true,
  email: true,
  accountType: true,
  systemRole: true,
  status: true,
  avatarUrl: true,
  permVersion: true,
  mustChangePassword: true,
} as const;

export interface LoginCandidate extends SessionUser {
  passwordHash: string | null;
}

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** UQ email (citext) / UQ phone; TK đã xoá mềm coi như không tồn tại */
  findForLogin(id: LoginIdentifier): Promise<LoginCandidate | null> {
    const where = id.kind === 'email' ? { email: id.email } : { phone: id.phone };
    return this.prisma.db.user.findFirst({
      where: { ...where, deletedAt: null },
      select: { ...SESSION_SELECT, passwordHash: true },
    });
  }

  findSession(userId: string): Promise<SessionUser | null> {
    return this.prisma.db.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: SESSION_SELECT,
    });
  }

  async touchLastLogin(userId: string, at: Date): Promise<void> {
    await this.prisma.db.user.update({ where: { id: userId }, data: { lastLoginAt: at } });
  }
}
