import { Injectable } from '@nestjs/common';
import type { OutboxPayload } from '@opchub/shared/outbox';
import type { JoinRequest, JoinResult } from '@opchub/shared/api-domains';
import type { AccessClaims } from '@/common/auth';
import { forbidden, notFound } from '@/common/errors';
import { OutboxService } from '@/common/outbox';
import { PrismaService } from '@/common/prisma/prisma.service';
import { UserEventsPublisher } from '@/common/realtime/user-events.publisher';
import { JoinRequestRepository } from '../repositories/join-request.repository';
import { GroupAccessService } from './group-access.service';

const OWNER_ONLY = 'Chỉ chủ nhóm được duyệt yêu cầu';

/** Yêu cầu vào nhóm — chủ nhóm duyệt/từ chối (QT-28…30, D-43) */
@Injectable()
export class JoinRequestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: JoinRequestRepository,
    private readonly access: GroupAccessService,
    private readonly outbox: OutboxService,
    private readonly events: UserEventsPublisher,
  ) {}

  async list(user: AccessClaims, groupId: string): Promise<JoinRequest[]> {
    if (!(await this.access.canManage(user, groupId))) throw forbidden(OWNER_ONLY);
    const rows = await this.repo.pendingOf(groupId);
    return rows.map((r) => ({
      userId: r.userId,
      groupId,
      fullName: r.user.fullName,
      avatarUrl: r.user.avatarUrl,
      intro: r.intro ?? '',
      requestedAt: r.createdAt.toISOString(),
    }));
  }

  async decide(
    user: AccessClaims,
    groupId: string,
    userId: string,
    decision: 'approve' | 'reject',
  ): Promise<JoinResult> {
    if (!(await this.access.canManage(user, groupId))) throw forbidden(OWNER_ONLY);
    const to = decision === 'approve' ? 'member' : 'rejected';
    await this.prisma.db.$transaction(async (tx) => {
      const name = await this.repo.decide(tx, groupId, userId, to, user.sub);
      if (!name) throw notFound('Không tìm thấy yêu cầu');
      if (to === 'member') {
        await this.repo.bumpMemberCount(tx, groupId);
        await this.repo.systemMessage(
          tx,
          groupId,
          `${name} vừa được duyệt vào nhóm. Chào mừng bạn!`,
        );
      }
      await this.outbox.add(tx, 'group.request_decided', { groupId, userId, decision });
    });
    return { groupId, status: to };
  }

  /** Consumer outbox `group.join_requested` (worker) → `member.request` tới chủ nhóm */
  async notifyOwners(p: OutboxPayload<'group.join_requested'>): Promise<void> {
    const owners = await this.repo.ownersOf(p.groupId);
    await Promise.all(owners.map((id) => this.events.publish(id, 'member.request', p)));
  }
}
