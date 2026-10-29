import { Injectable } from '@nestjs/common';
import type { ChatGroup, ChatOverview, ChatUnread } from '@opchub/shared/api-domains';
import type { AccessClaims } from '@/common/auth';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PresenceService } from '@/common/realtime/presence.service';
import { GroupService } from '@/modules/community';
import { UnreadService } from './unread.service';

/**
 * `GET /me/chat` — rail nhóm: đã tham gia / còn lại (thứ tự như lưới cộng đồng), chưa đọc theo
 * seq Redis (S-05), online = người có socket trong phòng của nhóm (S-01).
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
        where: { groupId: { in: joined }, deletedAt: null },
        select: { id: true, groupId: true },
      }),
      this.prisma.db.groupMember.findMany({
        where: { userId: user.sub, status: 'member', groupRole: 'owner' },
        select: { groupId: true },
      }),
    ]);
    const ownedIds = owned.map((o) => o.groupId);
    const [unread, online] = await Promise.all([
      this.unread.counts(
        user.sub,
        rooms.map((r) => r.id),
      ),
      this.presence.counts(rooms.map((r) => r.id)),
    ]);
    const sum = (groupId: string, m: Map<string, number>) =>
      rooms.filter((r) => r.groupId === groupId).reduce((n, r) => n + (m.get(r.id) ?? 0), 0);
    const all: ChatGroup[] = items.map((g) => ({
      ...g,
      // BUG-011 / D-36: ảnh bìa thật `groups.cover_url` (null → FE dùng ảnh mặc định tự host)
      thumbUrl: g.coverUrl,
      online: sum(g.id, online),
      unread: sum(g.id, unread),
      isOwner: ownedIds.includes(g.id),
    }));
    return {
      joined: all.filter((g) => g.myStatus === 'member'),
      others: all.filter((g) => g.myStatus !== 'member'),
    };
  }

  /**
   * `GET /me/chat/unread` (NA-25, REQ-225): một query phòng của các nhóm đã tham gia + một lần
   * `UnreadService.counts` (seq Redis) cho mọi phòng. Tin của mình không tính (seq người gửi).
   */
  async unreadSummary(userId: string): Promise<ChatUnread> {
    const rooms = await this.prisma.db.room.findMany({
      where: {
        deletedAt: null,
        group: { deletedAt: null, members: { some: { userId, status: 'member' } } },
      },
      select: { id: true, groupId: true },
    });
    const counts = await this.unread.counts(
      userId,
      rooms.map((r) => r.id),
    );
    const byGroup: Record<string, number> = {};
    const byRoom: Record<string, number> = {};
    let total = 0;
    for (const r of rooms) {
      const n = counts.get(r.id) ?? 0;
      byRoom[r.id] = n;
      byGroup[r.groupId] = (byGroup[r.groupId] ?? 0) + n;
      total += n;
    }
    return { total, byGroup, byRoom };
  }

  /** Nhóm trong `groupIds` mà user là thành viên — PK (group_id, user_id) */
  async memberGroups(userId: string, groupIds: readonly string[]): Promise<string[]> {
    if (!groupIds.length) return [];
    const rows = await this.prisma.db.groupMember.findMany({
      where: { userId, status: 'member', groupId: { in: [...groupIds] } },
      select: { groupId: true },
    });
    return rows.map((r) => r.groupId);
  }
}
