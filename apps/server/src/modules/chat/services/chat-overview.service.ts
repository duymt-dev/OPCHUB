import { Injectable } from '@nestjs/common';
import type { ChatGroup, ChatOverview } from '@opchub/shared/api-domains';
import type { AccessClaims } from '@/common/auth';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PresenceService } from '@/common/realtime/presence.service';
import { GroupService } from '@/modules/community';
import { groupImage } from '../domain/group-image';
import { UnreadService } from './unread.service';

/**
 * `GET /me/chat` — rail nhóm: đã tham gia / còn lại (thứ tự như lưới cộng đồng), chưa đọc theo
 * seq Redis (S-05), online = người có socket trong phòng của nhóm (S-01), yêu cầu chờ khi là chủ nhóm.
 */
@Injectable()
export class ChatOverviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly groups: GroupService,
    private readonly unread: UnreadService,
    private readonly presence: PresenceService,
  ) {}

  async overview(user: AccessClaims): Promise<ChatOverview> {
    const { items } = await this.groups.page(user.sub, { page: 1, size: 100 });
    const joined = items.filter((g) => g.myStatus === 'member').map((g) => g.id);
    const [rooms, owned] = await Promise.all([
      this.prisma.db.room.findMany({
        where: { groupId: { in: joined } },
        select: { id: true, groupId: true },
      }),
      this.prisma.db.groupMember.findMany({
        where: { userId: user.sub, status: 'member', groupRole: 'owner' },
        select: { groupId: true },
      }),
    ]);
    const ownedIds = owned.map((o) => o.groupId);
    const [unread, online, pending] = await Promise.all([
      this.unread.counts(
        user.sub,
        rooms.map((r) => r.id),
      ),
      this.presence.counts(rooms.map((r) => r.id)),
      ownedIds.length
        ? this.prisma.db.groupMember.groupBy({
            by: ['groupId'],
            where: { groupId: { in: ownedIds }, status: 'pending' },
            _count: { _all: true },
          })
        : Promise.resolve([]),
    ]);
    const sum = (groupId: string, m: Map<string, number>) =>
      rooms.filter((r) => r.groupId === groupId).reduce((n, r) => n + (m.get(r.id) ?? 0), 0);
    const pendingOf = new Map(pending.map((p) => [p.groupId, p._count._all]));
    const all: ChatGroup[] = items.map((g) => ({
      ...g,
      thumbUrl: groupImage(g.id, 120, 120),
      coverUrl: groupImage(g.id, 800, 360),
      online: sum(g.id, online),
      unread: sum(g.id, unread),
      isOwner: ownedIds.includes(g.id),
      pendingRequests: pendingOf.get(g.id) ?? 0,
    }));
    return {
      joined: all.filter((g) => g.myStatus === 'member'),
      others: all.filter((g) => g.myStatus !== 'member'),
    };
  }
}
