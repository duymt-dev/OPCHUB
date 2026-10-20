import { Injectable } from '@nestjs/common';
import type { LiveMetrics } from '@opchub/shared/api-domains';
import { PrismaService } from '@/common/prisma/prisma.service';
import { LiveCountersService, PresenceService } from '@/common/realtime';
import { RedisService } from '@/common/redis/redis.service';

const TOTALS_KEY = 'dashboard:totals';
/** Tổng thành viên/nhóm/lượt đăng ký sự kiện: cache 60 giây (S-10) — tick 3 giây chỉ đọc Redis */
const TOTALS_SEC = 60;
const VN_OFFSET_MS = 7 * 3_600_000;

/** 0h hôm nay giờ VN, dạng UTC */
export function vnMidnight(now: Date): Date {
  const v = new Date(now.getTime() + VN_OFFSET_MS);
  return new Date(Date.UTC(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate()) - VN_OFFSET_MS);
}

interface Totals {
  totalMembers: number;
  communities: number;
  eventJoins: number;
}

/**
 * NA-24: gói số liệu đẩy 3 giây (`metrics.updated`). Online (PresenceService), tin hôm nay / phút
 * qua, lượt tham gia phút qua, hoạt động trực tiếp — từ bộ đếm Redis; tổng từ cache 60 giây.
 * Chỉ khi Redis mất (miss) mới đếm DB một lần rồi ghi lại.
 */
@Injectable()
export class LiveMetricsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly presence: PresenceService,
    private readonly counters: LiveCountersService,
  ) {}

  async metrics(now = new Date()): Promise<LiveMetrics & { communities: number }> {
    const [snap, online, totals] = await Promise.all([
      this.counters.snapshot(now),
      this.presence.onlineCount(),
      this.totals(now),
    ]);
    let messagesToday = snap.messagesToday;
    if (messagesToday === null) {
      messagesToday = await this.prisma.db.message.count({
        where: { createdAt: { gte: vnMidnight(now) }, deletedAt: null },
      });
      await this.counters.seedMessagesToday(now, messagesToday);
    }
    return {
      generatedAt: now.toISOString(),
      communities: totals.communities,
      stats: {
        online,
        totalMembers: totals.totalMembers,
        joinsLastMinute: snap.joinsLastMinute,
        messagesToday,
        messagesLastMinute: snap.messagesLastMinute,
        eventJoins: totals.eventJoins,
      },
      activities: snap.activities,
    };
  }

  private async totals(now: Date): Promise<Totals> {
    const hit = await this.redis.client.get(TOTALS_KEY);
    if (hit) return JSON.parse(hit) as Totals;
    const db = this.prisma.db;
    const [totalMembers, communities, joins] = await Promise.all([
      db.user.count({ where: { status: 'active', deletedAt: null, systemRole: 'member' } }),
      db.group.count({ where: { deletedAt: null } }),
      db.event.aggregate({ where: { startsAt: { gte: now } }, _sum: { registeredCount: true } }),
    ]);
    const value: Totals = {
      totalMembers,
      communities,
      eventJoins: joins._sum.registeredCount ?? 0,
    };
    await this.redis.client.set(TOTALS_KEY, JSON.stringify(value), 'EX', TOTALS_SEC);
    return value;
  }
}
