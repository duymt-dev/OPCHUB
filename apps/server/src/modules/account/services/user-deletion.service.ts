import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '@/common/audit';
import { OutboxService } from '@/common/outbox';
import { AuthStateService } from '@/common/auth';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';

/** Internal command only: caller authorizes deletion. No new HTTP route or permission policy. */
@Injectable()
export class UserDeletionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    private readonly state: AuthStateService,
    private readonly refresh: RefreshTokenRepository,
  ) {}
  async softDelete(actor: { id: string; ip: string | null }, userId: string, now = new Date()) {
    return this.prisma.db.$transaction(async (tx) => {
      const changed = await tx.user.updateMany({
        where: { id: userId, deletedAt: null },
        data: { deletedAt: now, permVersion: { increment: 1 } },
      });
      if (!changed.count) return false;
      await this.outbox.add(tx, 'user.deleted', { userId });
      await this.outbox.add(tx, 'user.session_revoked', { userId, reason: 'logout_all' });
      await this.audit.log(tx, {
        actorId: actor.id,
        action: 'user.delete',
        entity: 'user',
        entityId: userId,
        tag: 'member',
        summary: 'Xóa tài khoản thành viên',
        ip: actor.ip,
      });
      return true;
    });
  }
  async effects(userId: string) {
    const user = await this.prisma.db.user.findUnique({
      where: { id: userId },
      select: { id: true, deletedAt: true, permVersion: true },
    });
    if (!user?.deletedAt) return;
    await this.state.applyStatus([{ id: user.id, permVersion: user.permVersion }], true);
    await this.refresh.revokeAllOfUsers([userId], new Date());
  }
}
