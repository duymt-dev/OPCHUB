import { Injectable } from '@nestjs/common';
import {
  type AdminBadges,
  type AdminOverview,
  adminOverviewSchema,
} from '@opchub/shared/api-domains';
import { type AccessClaims, PermissionCheck } from '@/common/auth';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';

const CACHE_KEY = 'admin:overview';
const CACHE_SEC = 60;
const MONTHS = 7;
const VN_OFFSET_MS = 7 * 3_600_000;

/** 7 tháng VN gần nhất (cũ → mới): ngày cuối tháng (tháng hiện tại = hôm nay) + nhãn "T10" */
export function lastMonths(now: Date): { day: string; label: string }[] {
  const vn = new Date(now.getTime() + VN_OFFSET_MS);
  const y = vn.getUTCFullYear();
  const m = vn.getUTCMonth();
  return Array.from({ length: MONTHS }, (_, i) => {
    const k = m - (MONTHS - 1 - i);
    const last = i === MONTHS - 1 ? vn : new Date(Date.UTC(y, k + 1, 0));
    const month = ((k % 12) + 12) % 12;
    return { day: last.toISOString().slice(0, 10), label: `T${month + 1}` };
  });
}

/** 0h ngày 1 tháng VN hiện tại (UTC) + ngày VN hôm nay */
function vnMonth(now: Date): { start: Date; today: string } {
  const v = new Date(now.getTime() + VN_OFFSET_MS);
  const start = new Date(Date.UTC(v.getUTCFullYear(), v.getUTCMonth(), 1) - VN_OFFSET_MS);
  return { start, today: v.toISOString().slice(0, 10) };
}

/** % mới tháng này so với tổng đầu tháng, 1 chữ số thập phân */
export const deltaPct = (total: number, fresh: number): number =>
  total - fresh > 0 ? Math.round((fresh / (total - fresh)) * 1000) / 10 : 0;

/**
 * Admin Tổng quan (B44). KPI = đếm hiện tại trên index; sparkline + tăng trưởng = `stats_daily`
 * (ngày chụp gần nhất mỗi tháng — 1 query). Cache Redis 60 giây (S-03).
 */
@Injectable()
export class OverviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly perms: PermissionCheck,
  ) {}

  async overview(now = new Date()): Promise<AdminOverview> {
    const hit = await this.redis.client.get(CACHE_KEY);
    if (hit) {
      const p = adminOverviewSchema.safeParse(JSON.parse(hit));
      if (p.success) return p.data;
    }
    const value = await this.compute(now);
    await this.redis.client.set(CACHE_KEY, JSON.stringify(value), 'EX', CACHE_SEC);
    return value;
  }

  /** Badge theo quyền người gọi (luật 4: permission key) — guard đã chặn người không có khoá nào */
  async badges(user: AccessClaims): Promise<AdminBadges> {
    const can = await this.perms.checker(user);
    const db = this.prisma.db;
    const [reports, projects, requests] = await Promise.all([
      can('groups.view') ? db.report.count({ where: { status: 'open' } }) : 0,
      can('projects.view')
        ? db.project.count({ where: { status: 'pending_review', deletedAt: null } })
        : 0,
      // D-72 (Q-V4-605-2): không còn trạng thái — phiếu chưa có ghi chú nội bộ nào là "mới"
      can('services.view') ? db.serviceRequest.count({ where: { comments: { none: {} } } }) : 0,
    ]);
    return { reports, projects, requests };
  }

  private async compute(now: Date): Promise<AdminOverview> {
    const months = lastMonths(now);
    const db = this.prisma.db;
    const { start, today } = vnMonth(now);
    const live = { deletedAt: null, systemRole: 'member' } as const;
    const [members, communities, projects, pending, events, series, fresh, groupsNew] =
      await Promise.all([
        db.user.count({ where: live }),
        db.group.count({ where: { deletedAt: null } }),
        db.project.count({ where: { status: 'published', deletedAt: null } }),
        db.project.count({ where: { status: 'pending_review', deletedAt: null } }),
        db.event.count({ where: { startsAt: { gte: now } } }),
        this.series(months.map((m) => m.day)),
        db.user.count({ where: { ...live, createdAt: { gte: start } } }),
        db.group.count({ where: { deletedAt: null, createdAt: { gte: start } } }),
      ]);
    const pick = (metric: string) =>
      months.map((m) => series.get(`${m.day.slice(0, 7)}|${metric}`) ?? 0);
    const active = pick('members_active');
    const monthly = this.monthlyNew(months, series);
    const inactive = pick('members_inactive');
    return {
      // BUG-029: khoảng = đầu tháng → hôm nay (VN); delta và số mới tháng này tính thật
      range: { from: `${today.slice(0, 8)}01`, to: today },
      membersDeltaPct: deltaPct(members, fresh),
      newThisMonth: fresh,
      communitiesNew: groupsNew,
      members: { value: members, spark: pick('members_total') },
      communities: { value: communities, spark: pick('groups') },
      projects: { value: projects, pending, spark: pick('projects_live') },
      events: { value: events, spark: pick('events_upcoming') },
      growth: months.map((m, i) => ({
        month: m.label,
        active: active[i] ?? 0,
        fresh: monthly[i] ?? 0,
        inactive: inactive[i] ?? 0,
      })),
    };
  }

  /** Thành viên mới mỗi tháng = tổng `members_new` các ngày trong tháng */
  private monthlyNew(months: { day: string }[], series: Map<string, number>): number[] {
    return months.map((m) => series.get(`${m.day.slice(0, 7)}|members_new_sum`) ?? 0);
  }

  /**
   * Đọc `stats_daily` 7 tháng (≤ 8 chỉ số × ~210 ngày, theo PK day): ảnh chụp mới nhất mỗi tháng
   * cho từng chỉ số + tổng `members_new` theo tháng. Khoá `YYYY-MM|metric`.
   */
  private async series(days: string[]): Promise<Map<string, number>> {
    const first = `${days[0]?.slice(0, 7) ?? '1970-01'}-01`;
    const last = days.at(-1) ?? first;
    const [snap, fresh] = await Promise.all([
      this.prisma.db.$queryRaw<{ ym: string; metric: string; value: bigint }[]>`
        SELECT DISTINCT ON (ym, metric) ym, metric, value FROM (
          SELECT to_char(day, 'YYYY-MM') AS ym, metric, value, day FROM stats_daily
          WHERE day BETWEEN ${first}::date AND ${last}::date AND dimension = ''
            AND metric <> 'members_new'
        ) s ORDER BY ym, metric, day DESC`,
      this.prisma.db.$queryRaw<{ ym: string; value: bigint }[]>`
        SELECT to_char(day, 'YYYY-MM') AS ym, sum(value)::bigint AS value FROM stats_daily
        WHERE day BETWEEN ${first}::date AND ${last}::date AND metric = 'members_new'
          AND dimension = ''
        GROUP BY 1`,
    ]);
    return new Map([
      ...snap.map((r): [string, number] => [`${r.ym}|${r.metric}`, Number(r.value)]),
      ...fresh.map((r): [string, number] => [`${r.ym}|members_new_sum`, Number(r.value)]),
    ]);
  }
}
