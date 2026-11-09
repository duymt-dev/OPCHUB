import { Injectable } from '@nestjs/common';
import { Prisma } from '@opchub/db';
import {
  type AdminBadges,
  type AdminOverview,
  type AdminOverviewQuery,
  adminOverviewSchema,
} from '@opchub/shared/api-domains';
import { type AccessClaims, PermissionCheck } from '@/common/auth';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { OverviewFlowRepository } from './overview-flow.repository';

const CACHE_KEY = 'admin:overview';
const CACHE_SEC = 60;
const MONTHS = 7;
const VN_OFFSET_MS = 7 * 3_600_000;

export interface OverviewInterval {
  day: string;
  label: string;
  key: string;
}

/** 7 tuần VN gần nhất (cũ → mới) */
export function lastWeeks(now: Date): OverviewInterval[] {
  const vn = new Date(now.getTime() + VN_OFFSET_MS);
  return Array.from({ length: 7 }, (_, i) => {
    const offsetDays = (6 - i) * 7;
    const target = new Date(vn.getTime() - offsetDays * 86_400_000);
    const dayStr = target.toISOString().slice(0, 10);
    const d = new Date(
      Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate()),
    );
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
    const isoYear = d.getUTCFullYear();
    const padWeek = String(weekNo).padStart(2, '0');
    return {
      day: dayStr,
      label: `W${weekNo}`,
      key: `${isoYear}-W${padWeek}`,
    };
  });
}

/** 7 năm VN gần nhất (cũ → mới) */
export function lastYears(now: Date): OverviewInterval[] {
  const vn = new Date(now.getTime() + VN_OFFSET_MS);
  const currentYear = vn.getUTCFullYear();
  return Array.from({ length: 7 }, (_, i) => {
    const y = currentYear - (6 - i);
    const lastDay = i === 6 ? vn.toISOString().slice(0, 10) : `${y}-12-31`;
    return {
      day: lastDay,
      label: `${y}`,
      key: `${y}`,
    };
  });
}

/** 7 tháng VN gần nhất (cũ → mới): ngày cuối tháng (tháng hiện tại = hôm nay) + nhãn "T10" */
export function lastMonths(now: Date): OverviewInterval[] {
  const vn = new Date(now.getTime() + VN_OFFSET_MS);
  const y = vn.getUTCFullYear();
  const m = vn.getUTCMonth();
  return Array.from({ length: MONTHS }, (_, i) => {
    const k = m - (MONTHS - 1 - i);
    const last = i === MONTHS - 1 ? vn : new Date(Date.UTC(y, k + 1, 0));
    const month = ((k % 12) + 12) % 12;
    const yearOffset = Math.floor(k / 12);
    const actualYear = y + yearOffset;
    const ym = `${actualYear}-${String(month + 1).padStart(2, '0')}`;
    return { day: last.toISOString().slice(0, 10), label: `T${month + 1}`, key: ym };
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
    private readonly flow: OverviewFlowRepository,
  ) {}

  async overview(now = new Date(), query?: AdminOverviewQuery): Promise<AdminOverview> {
    const period = query?.period ?? 'month';
    const hasCustom = !!(query?.from || query?.to || (query?.period && query.period !== 'month'));
    const cacheKey = hasCustom
      ? `admin:overview:${period}:${query?.from ?? ''}:${query?.to ?? ''}`
      : CACHE_KEY;
    const hit = await this.redis.client.get(cacheKey);
    if (hit) {
      const p = adminOverviewSchema.safeParse(JSON.parse(hit));
      if (p.success) return p.data;
    }
    const value = await this.compute(now, query);
    await this.redis.client.set(cacheKey, JSON.stringify(value), 'EX', CACHE_SEC);
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

  private async compute(now: Date, query?: AdminOverviewQuery): Promise<AdminOverview> {
    const period = query?.period ?? 'month';
    const months = lastMonths(now);
    const intervals =
      period === 'week' ? lastWeeks(now) : period === 'year' ? lastYears(now) : months;
    const db = this.prisma.db;
    const { start: defaultStart, today } = vnMonth(now);
    const rangeFrom = query?.from ?? `${today.slice(0, 8)}01`;
    const rangeTo = query?.to ?? today;
    const start = query?.from ? new Date(query.from + 'T00:00:00+07:00') : defaultStart;
    const end = query?.to ? new Date(query.to + 'T23:59:59.999+07:00') : now;

    const live = { deletedAt: null, systemRole: 'member' } as const;
    const [
      members,
      communities,
      projects,
      pending,
      events,
      upcoming,
      growthSeries,
      monthSeries,
      fresh,
      groupsNew,
    ] = await Promise.all([
      db.user.count({ where: { ...live, createdAt: { lte: end } } }),
      db.group.count({ where: { deletedAt: null, createdAt: { lte: end } } }),
      db.project.count({
        where: { status: 'published', deletedAt: null, createdAt: { lte: end } },
      }),
      db.project.count({
        where: { status: 'pending_review', deletedAt: null, createdAt: { lte: end } },
      }),
      db.event.count({ where: { createdAt: { lte: end } } }),
      db.event.count({ where: { startsAt: { gte: now } } }),
      this.series(intervals, period),
      period === 'month' ? Promise.resolve(null) : this.series(months, 'month'),
      db.user.count({ where: { ...live, createdAt: { gte: start, lte: end } } }),
      db.group.count({ where: { deletedAt: null, createdAt: { gte: start, lte: end } } }),
    ]);
    const [paid, flow] = await Promise.all([this.flow.paid(start), this.flow.counts()]);

    const activeMonthlySeries = monthSeries ?? growthSeries;
    const pickMonthly = (metric: string) =>
      months.map((m) => activeMonthlySeries.get(`${m.key}|${metric}`) ?? 0);

    const pickGrowth = (metric: string) =>
      intervals.map((m) => growthSeries.get(`${m.key}|${metric}`) ?? 0);
    const active = pickGrowth('members_active');
    const freshGrowth = this.periodNew(intervals, growthSeries);
    const inactive = pickGrowth('members_inactive');

    return {
      // BUG-029: khoảng = đầu tháng → hôm nay (VN); delta và số mới tháng này tính thật
      range: { from: rangeFrom, to: rangeTo },
      membersDeltaPct: deltaPct(members, fresh),
      newThisMonth: fresh,
      communitiesNew: groupsNew,
      members: { value: members, spark: pickMonthly('members_total') },
      communities: { value: communities, spark: pickMonthly('groups') },
      projects: { value: projects, pending, spark: pickMonthly('projects_live') },
      events: { value: events, upcoming, spark: pickMonthly('events_upcoming') },
      paid: { ...paid, deltaPct: deltaPct(paid.value, paid.newThisMonth) },
      flow: {
        ...flow,
        paidMembers: paid.value,
        members,
        projects: { pending, published: projects },
        groups: communities,
      },
      growth: intervals.map((m, i) => ({
        month: m.label,
        active: active[i] ?? 0,
        fresh: freshGrowth[i] ?? 0,
        inactive: inactive[i] ?? 0,
      })),
    };
  }

  /** Thành viên mới mỗi chu kỳ = tổng `members_new` các ngày trong chu kỳ */
  private periodNew(intervals: { key: string }[], series: Map<string, number>): number[] {
    return intervals.map((m) => series.get(`${m.key}|members_new_sum`) ?? 0);
  }

  /**
   * Đọc `stats_daily` chu kỳ (≤ 8 chỉ số × số ngày, theo PK day): ảnh chụp mới nhất mỗi mốc
   * cho từng chỉ số + tổng `members_new` theo mốc. Khoá `ym|metric`.
   */
  private async series(
    intervals: OverviewInterval[],
    period: 'week' | 'month' | 'year',
  ): Promise<Map<string, number>> {
    const first = `${intervals[0]?.day.slice(0, 4)}-01-01`;
    const last = intervals.at(-1)?.day ?? first;
    const formatSql =
      period === 'week'
        ? Prisma.sql`to_char(day, 'IYYY-"W"IW')`
        : period === 'year'
          ? Prisma.sql`to_char(day, 'YYYY')`
          : Prisma.sql`to_char(day, 'YYYY-MM')`;

    const [snap, fresh] = await Promise.all([
      this.prisma.db.$queryRaw<{ ym: string; metric: string; value: bigint }[]>`
        SELECT DISTINCT ON (ym, metric) ym, metric, value FROM (
          SELECT ${formatSql} AS ym, metric, value, day FROM stats_daily
          WHERE day BETWEEN ${first}::date AND ${last}::date AND dimension = ''
            AND metric <> 'members_new'
        ) s ORDER BY ym, metric, day DESC`,
      this.prisma.db.$queryRaw<{ ym: string; value: bigint }[]>`
        SELECT ${formatSql} AS ym, sum(value)::bigint AS value FROM stats_daily
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
