import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

/** Các chỉ số chụp mỗi ngày (giờ VN) vào `stats_daily` */
export const STAT_METRICS = [
  'members_total',
  'members_new',
  'members_active',
  'members_inactive',
  'groups',
  'projects_live',
  'projects_pending',
  'events_upcoming',
] as const;

const VN_OFFSET_MS = 7 * 3_600_000;

/** Ngày VN hôm qua (job chạy 00:10 chụp ngày vừa kết thúc) */
export function vnYesterday(now: Date): string {
  return new Date(now.getTime() + VN_OFFSET_MS - 86_400_000).toISOString().slice(0, 10);
}

/**
 * Job `scheduler.statsDaily {day}` (B44). Một câu INSERT … SELECT … ON CONFLICT ghi mọi chỉ số
 * (đếm trên index / partial index — không quét theo từng dòng ở app). Chạy lại cùng ngày → ghi đè.
 * `groups.weekly_active` = số người gửi tin trong 7 ngày, một câu UPDATE … FROM.
 */
@Injectable()
export class StatsDailyService {
  constructor(private readonly prisma: PrismaService) {}

  async capture(day: string): Promise<void> {
    // Mốc cuối ngày VN (UTC) — chỉ số "đến hết ngày"
    const end = new Date(`${day}T00:00:00+07:00`).getTime() + 86_400_000;
    const until = new Date(end);
    const from = new Date(end - 86_400_000);
    await this.prisma.db.$executeRaw`
      INSERT INTO stats_daily (day, metric, dimension, value)
      SELECT ${day}::date, m.metric, '', m.value FROM (VALUES
        ('members_total', (SELECT count(*) FROM users
            WHERE deleted_at IS NULL AND system_role = 'member' AND created_at < ${until})),
        ('members_new', (SELECT count(*) FROM users
            WHERE deleted_at IS NULL AND system_role = 'member'
              AND created_at >= ${from} AND created_at < ${until})),
        ('members_active', (SELECT count(*) FROM membership_fees
            WHERE status IN ('active', 'expiring'))),
        ('members_inactive', (SELECT count(*) FROM membership_fees
            WHERE status IN ('pending_payment', 'expired'))),
        ('groups', (SELECT count(*) FROM groups WHERE deleted_at IS NULL)),
        ('projects_live', (SELECT count(*) FROM projects
            WHERE status = 'published' AND deleted_at IS NULL)),
        ('projects_pending', (SELECT count(*) FROM projects
            WHERE status = 'pending_review' AND deleted_at IS NULL)),
        ('events_upcoming', (SELECT count(*) FROM events WHERE starts_at >= ${until}))
      ) AS m(metric, value)
      ON CONFLICT (day, metric, dimension) DO UPDATE SET value = EXCLUDED.value`;
    await this.weeklyActive(until);
  }

  /** Người gửi tin 7 ngày theo nhóm (idx messages room_id, created_at) */
  async weeklyActive(now: Date): Promise<void> {
    const since = new Date(now.getTime() - 7 * 86_400_000);
    await this.prisma.db.$executeRaw`
      UPDATE groups g SET weekly_active = COALESCE(a.n, 0)
      FROM groups g2
      LEFT JOIN (
        SELECT r.group_id, count(DISTINCT m.sender_id)::int AS n
        FROM rooms r JOIN messages m ON m.room_id = r.id
        WHERE m.created_at >= ${since} AND m.created_at < ${now} AND m.sender_id IS NOT NULL
        GROUP BY r.group_id
      ) a ON a.group_id = g2.id
      WHERE g.id = g2.id AND g.deleted_at IS NULL AND g.weekly_active IS DISTINCT FROM COALESCE(a.n, 0)`;
  }
}
