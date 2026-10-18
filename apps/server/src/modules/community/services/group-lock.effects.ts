import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { AuditService } from '@/common/audit';
import { PrismaService } from '@/common/prisma/prisma.service';
import { type LockEffects, LockEffectsRegistry } from '../../account';
import { GroupAdminRepository } from '../repositories/group-admin.repository';

/**
 * D-15, D-55 (V2Q-60): TK bị khoá đang làm chủ nhóm → chuyển chủ về Super Admin active cũ nhất,
 * TK khoá ở lại làm thành viên thường. Một transaction, audit hệ thống (`actorId = null`), không
 * gửi thông báo. Mở khoá: không trả lại nhóm (D-55). Sau TIP-V2-201: lấy Admin từ `admin_users`.
 */
@Injectable()
export class GroupLockEffects implements LockEffects, OnModuleInit {
  private readonly logger = new Logger(GroupLockEffects.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: GroupAdminRepository,
    private readonly audit: AuditService,
    private readonly registry: LockEffectsRegistry,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async onLocked(userIds: readonly string[]): Promise<void> {
    if (!userIds.length) return;
    await this.prisma.db.$transaction(async (tx) => {
      const adminId = await this.repo.oldestSuperAdmin(tx);
      if (!adminId) {
        this.logger.error({ userIds }, 'Không có Super Admin đang hoạt động để nhận nhóm');
        throw new Error('Không có Super Admin đang hoạt động để nhận nhóm của TK bị khoá');
      }
      const moved = await this.repo.transferOwnedTo(tx, userIds, adminId);
      await this.audit.logMany(
        tx,
        moved.map((m) => ({
          actorId: null,
          action: 'group.owner_transfer',
          entity: 'group',
          entityId: m.groupId,
          tag: 'member' as const,
          summary: `Chuyển chủ nhóm ${m.name} về Admin (TK bị khoá)`,
          diff: { from: m.fromUserId, to: adminId, reason: 'locked' },
        })),
      );
    });
  }

  /** D-55: nhóm không tự trả lại khi mở khoá */
  onUnlocked(): Promise<void> {
    return Promise.resolve();
  }
}
